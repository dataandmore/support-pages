/**
 * Download all HubSpot-hosted images from article content to local storage,
 * then update the DB to point to the local copies.
 *
 * 1. Scans all article translations for HubSpot image URLs
 * 2. Downloads each image to public/hubspot-images/
 * 3. Updates the article content to use /hubspot-images/ paths
 *
 * Run: npx tsx scripts/download-hubspot-images.ts
 * Flags: --dry-run  Show what would be done without downloading
 */

import fs from "fs"
import path from "path"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function readEnvFile(filePath: string): Record<string, string> {
  try {
    const lines = fs.readFileSync(filePath, "utf-8").split("\n")
    const vars: Record<string, string> = {}
    for (const line of lines) {
      const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
      if (m) vars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "")
    }
    return vars
  } catch {
    return {}
  }
}

const envVars = readEnvFile(".env.local")
const dbUrl = process.env.DATABASE_URL || envVars.DATABASE_URL
if (!dbUrl) { console.error("DATABASE_URL not set"); process.exit(1) }

const adapter = new PrismaPg({ connectionString: dbUrl })
const prisma = new PrismaClient({ adapter })
const DRY_RUN = process.argv.includes("--dry-run")

// HubSpot CDN IP (Cloudflare) — must use HTTP with Host header since
// the SSL cert doesn't cover the hs-sites subdomain from script context
const HUBSPOT_ORIGIN = "http://104.18.96.115"
const HUBSPOT_HOST = "support.dataandmore.com"
const OUTPUT_DIR = path.join(process.cwd(), "public", "hubspot-images")

// Match HubSpot image URLs in article content JSON
const URL_PATTERN = /https?:\/\/support\.dataandmore\.com\/((?:hs-fs\/)?hubfs\/[^"?]+)/g

async function downloadImage(urlPath: string, localPath: string): Promise<boolean> {
  try {
    const res = await fetch(`${HUBSPOT_ORIGIN}/${urlPath}`, {
      headers: { "User-Agent": "Mozilla/5.0", "Host": HUBSPOT_HOST },
      redirect: "follow",
    })
    if (!res.ok || !res.body) return false
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 100) return false // skip tiny/empty responses
    const dir = path.dirname(localPath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(localPath, buffer)
    return true
  } catch {
    return false
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const translations = await prisma.articleTranslation.findMany({
    select: { id: true, content: true, locale: true, title: true },
  })

  console.log(`Scanning ${translations.length} translations for HubSpot images...\n`)

  // Collect all unique URLs
  const urlMap = new Map<string, string>() // hubspot path → local filename
  for (const t of translations) {
    const body = JSON.stringify(t.content)
    let match
    URL_PATTERN.lastIndex = 0
    while ((match = URL_PATTERN.exec(body)) !== null) {
      const hubPath = match[1] // e.g. "hubfs/image-png-...png"
      if (!urlMap.has(hubPath)) {
        const filename = hubPath.replace(/^(hs-fs\/)?hubfs\//, "").replace(/[^a-zA-Z0-9._-]/g, "_")
        urlMap.set(hubPath, filename)
      }
    }
  }

  console.log(`Found ${urlMap.size} unique HubSpot images\n`)

  if (DRY_RUN) {
    for (const [hubPath, filename] of urlMap) {
      console.log(`  Would download: ${hubPath} → ${filename}`)
    }
    console.log(`\nDry run — no files downloaded.`)
    await prisma.$disconnect()
    return
  }

  // Download all images
  console.log("── Downloading images ──")
  let downloaded = 0
  let failed = 0
  let skipped = 0
  for (const [hubPath, filename] of urlMap) {
    const localPath = path.join(OUTPUT_DIR, filename)
    if (fs.existsSync(localPath)) {
      skipped++
      continue
    }
    process.stdout.write(`  Downloading ${filename}...`)
    const ok = await downloadImage(hubPath, localPath)
    if (ok) {
      downloaded++
      process.stdout.write(` ✓\n`)
    } else {
      failed++
      process.stdout.write(` ✗\n`)
    }
    // Small delay
    await new Promise(r => setTimeout(r, 100))
  }
  console.log(`\nDownloaded: ${downloaded}, Skipped (exists): ${skipped}, Failed: ${failed}\n`)

  // Update article content to use local paths
  console.log("── Updating article content ──")
  let updated = 0
  for (const t of translations) {
    let body = JSON.stringify(t.content)
    let changed = false
    for (const [hubPath, filename] of urlMap) {
      // Replace full URL with local path
      const fullUrl = `https://support.dataandmore.com/${hubPath}`
      const localUrl = `/hubspot-images/${filename}`
      if (body.includes(fullUrl)) {
        body = body.split(fullUrl).join(localUrl)
        changed = true
      }
      // Also handle without https
      const httpUrl = `http://support.dataandmore.com/${hubPath}`
      if (body.includes(httpUrl)) {
        body = body.split(httpUrl).join(localUrl)
        changed = true
      }
    }
    if (changed) {
      await prisma.articleTranslation.update({
        where: { id: t.id },
        data: { content: JSON.parse(body) },
      })
      updated++
    }
  }

  console.log(`Updated ${updated} translations\n`)
  console.log("✓ Done!")
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
