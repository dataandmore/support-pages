/**
 * Import all product videos from Synthesia into the video library.
 *
 * Groups by language prefix (DA -, SV -, DE - → locale; no prefix → EN).
 * Deduplicates by base title: if multiple copies of the same base title exist,
 * only the latest (first in list) is imported.
 *
 * Usage:  npm run migrate:synthesia
 *         npm run migrate:synthesia -- --dry-run
 */

import fs from "fs/promises"
import path from "path"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { transcodeToHLS } from "../src/lib/ffmpeg"

process.loadEnvFile(path.join(process.cwd(), ".env.local"))

const DRY_RUN = process.argv.includes("--dry-run")

function createPrisma() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL not set")
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

const prisma = createPrisma()

// ─── Language prefix detection ────────────────────────────────────────────────

const LOCALE_PREFIXES: [string, string][] = [
  ["DE (Germany) - ", "de"],
  ["DA - ", "da"],
  ["SV - ", "sv"],
  ["DE - ", "de"],
  ["JA (Plain) - ", "ja"],
  ["ES - ", "es"],
  ["FR - ", "fr"],
  ["PL - ", "pl"],
  ["HR - ", "hr"],
]

function parseLocaleAndBase(title: string): { locale: string; base: string } {
  for (const [prefix, locale] of LOCALE_PREFIXES) {
    if (title.startsWith(prefix)) {
      return { locale, base: title.slice(prefix.length).trim() }
    }
  }
  return { locale: "en", base: title }
}

// ─── Slug helpers ─────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[|™]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base
  let counter = 2
  while (await prisma.video.findUnique({ where: { slug } })) {
    slug = `${base}-${counter++}`
  }
  return slug
}

// ─── Product descriptions ─────────────────────────────────────────────────────
// Sourced from dataandmore.com — used as EN video descriptions in the library.

const DESCRIPTIONS: Record<string, string> = {
  "PrivacyMonitor | Dashboard":
    "A complete walkthrough of the Data & More PrivacyMonitor Dashboard — your central hub for monitoring compliance levels, reviewing sensitive data across all connected sources, and tracking clean-up progress across departments.",
  "Privacy Platform":
    "An overview of the full Data & More Privacy Platform, showing how it automatically identifies sensitive and personal data across Exchange, SharePoint, OneDrive, file shares, and more.",
  "Data Minimization Manager Overview":
    "Learn how the Data Minimization Manager lets you define data policies and retention rules, automatically handling non-compliant documents containing salary information, job applications, GDPR Article 9 data, and other sensitive content.",
  "Product |  Data Minimization Manager Overview":
    "Learn how the Data Minimization Manager lets you define data policies and retention rules, automatically handling non-compliant documents across your entire Microsoft 365 environment.",
  "CoPilot Privacy Protection":
    "Discover how Data & More protects your Microsoft Copilot deployment by ensuring AI only has access to data it is permitted to see — preventing sensitive personal data from being surfaced in Copilot responses.",
  "DataSubject Manager™":
    "A guide to the DataSubject Manager™ — enabling your organization to efficiently respond to GDPR data subject access requests by instantly locating all personal data held across connected data sources.",
  "Data Privacy Classification":
    "A deep dive into Data & More's automatic data classification engine, which uses a combination of taxonomies, RegEx, and Natural Language Processing (NLP) to identify and label sensitive personal data according to GDPR and internal policies.",
  "Privacy Manager Setup Guide":
    "Step-by-step setup guide for the Data & More Privacy Manager — covering installation, source connection, and initial configuration to get your compliance monitoring up and running.",
  "Personal Accoutn Deletion tool":
    "How to use the Personal Account Deletion tool to let individual employees review and delete their own non-compliant personal data — reducing DPO workload and empowering employees in the clean-up process.",
  "Mastering Privacy with the Personal Data Deletion Tool":
    "Best practices for rolling out the Personal Data Deletion tool across your organization — empowering employees to take responsibility for their own data hygiene with minimal IT involvement.",
  "DLP User Guide - Setup, Run & Test":
    "A complete user guide for setting up, running, and testing the Data Loss Prevention (DLP) module — covering policy creation, enforcement rules, and how to verify your configuration is working correctly.",
  "DAM for Purview":
    "How Data & More integrates with Microsoft Purview to extend data classification and compliance capabilities within your existing Microsoft security ecosystem.",
  "DA - D&M for Purview":
    "Sådan integrerer Data & More med Microsoft Purview for at udvide dataklassificering og compliance inden for dit eksisterende Microsoft-sikkerheds-økosystem.",
  "Data & More - Gmail Integration Setup Guide (Google Cloud Service Account)":
    "Step-by-step guide for setting up the Data & More Gmail integration using a Google Cloud Service Account — enabling compliance monitoring and data classification across your Google Workspace email.",
  "Introduciotn to D/M PP":
    "An introduction to the Data & More Privacy Platform — what it does, how it works, and why protecting unstructured personal data across your organization matters for GDPR compliance.",
  "global admin":
    "How global administrators set up and manage the Data & More platform — covering user roles, access controls, source configuration, and administrative best practices.",
}

// ─── Synthesia API types ──────────────────────────────────────────────────────

interface SynthesiaVideo {
  id: string
  title: string
  status: string
  download: string | { url: string } | null
  thumbnail: string | { url: string } | null
  duration: string | number | null
  created_at?: number
}

function getUrl(val: string | { url: string } | null | undefined): string {
  if (!val) return ""
  if (typeof val === "string") return val
  return val.url ?? ""
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.SYNTHESIA_API_KEY
  if (!apiKey) throw new Error("SYNTHESIA_API_KEY not set in .env.local")

  console.log(`[synthesia] Fetching video list…`)
  const res = await fetch("https://api.synthesia.io/v2/videos?limit=100", {
    headers: { Authorization: apiKey },
  })
  if (!res.ok) throw new Error(`Synthesia API error ${res.status}`)
  const data = await res.json()
  const all: SynthesiaVideo[] = Array.isArray(data) ? data : (data.videos ?? [])

  // Only complete videos with download links
  const complete = all.filter(
    (v) => v.status === "complete" && getUrl(v.download as string)
  )
  console.log(`[synthesia] ${all.length} total, ${complete.length} complete with download URL`)

  // ── Skip non-product videos (test probes, AI news briefings) ─────────────
  const SKIP_PATTERNS = [/^probe$/i, /^AI Pulse/i]

  // ── Group by base title, keeping only one per (locale, base) ─────────────
  const seen = new Set<string>()                   // "locale:base"
  const filtered: SynthesiaVideo[] = []

  for (const v of complete) {
    if (SKIP_PATTERNS.some((re) => re.test(v.title.trim()))) {
      console.log(`[synthesia] SKIP (non-product): ${v.title}`)
      continue
    }
    const { locale, base } = parseLocaleAndBase(v.title)
    const key = `${locale}:${base}`
    if (seen.has(key)) {
      console.log(`[synthesia] SKIP duplicate: ${v.title}`)
      continue
    }
    seen.add(key)
    filtered.push(v)
  }
  console.log(`[synthesia] ${filtered.length} unique videos after deduplication`)

  if (DRY_RUN) {
    console.log("\n[synthesia] DRY RUN — would import:")
    for (const v of filtered) {
      const { locale, base } = parseLocaleAndBase(v.title)
      console.log(`  [${locale}] ${base}`)
    }
    return
  }

  // ── Ensure upload dirs exist ────────────────────────────────────────────────
  const originalsDir = path.join(process.cwd(), "uploads", "videos", "originals")
  const thumbnailsDir = path.join(process.cwd(), "uploads", "videos", "thumbnails")
  await fs.mkdir(originalsDir, { recursive: true })
  await fs.mkdir(thumbnailsDir, { recursive: true })

  let imported = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < filtered.length; i++) {
    const v = filtered[i]
    const { locale, base } = parseLocaleAndBase(v.title)
    const downloadUrl = getUrl(v.download as string)
    const thumbnailUrl = getUrl(v.thumbnail as string)

    // Skip if already imported (Synthesia video ID embedded in originalFilename)
    const existing = await prisma.video.findFirst({
      where: { originalFilename: { contains: v.id } },
    })
    if (existing) {
      console.log(`[synthesia] ${i + 1}/${filtered.length} SKIP (exists) ${v.title}`)
      skipped++
      continue
    }

    console.log(`[synthesia] ${i + 1}/${filtered.length} Downloading: ${v.title}`)

    try {
      // Download the MP4 — Synthesia download URLs are pre-signed S3 URLs that
      // embed auth in query params; adding an Authorization header causes HTTP 400.
      const dlRes = await fetch(downloadUrl)
      if (!dlRes.ok) throw new Error(`HTTP ${dlRes.status} downloading ${v.title}`)
      const buffer = Buffer.from(await dlRes.arrayBuffer())

      const id = crypto.randomUUID()
      const safeBase = slugify(base)
      const filename = `${id}-synthesia-${v.id}.mp4`
      const originalPath = path.join(originalsDir, filename)
      const thumbnailPath = path.join(thumbnailsDir, `${id}.jpg`)
      const hlsOutputDir = path.join(process.cwd(), "uploads", "videos", "hls", id)
      const slug = await uniqueSlug(safeBase)

      await fs.writeFile(originalPath, buffer)
      console.log(`[synthesia]   Saved ${(buffer.length / 1024 / 1024).toFixed(1)} MB`)

      // Get EN description if available
      const description = DESCRIPTIONS[base] ?? null

      // Create DB record + EN translation
      const video = await prisma.video.create({
        data: {
          id,
          slug,
          filename,
          originalFilename: `synthesia-${v.id}.mp4`,
          size: BigInt(buffer.length),
          status: "PROCESSING",
          translations: {
            create: {
              locale: locale as "en" | "da" | "sv" | "de",
              title: base,
              description,
            },
          },
        },
      })

      // Transcode in background
      transcodeToHLS(originalPath, hlsOutputDir, thumbnailPath)
        .then(({ duration }) =>
          prisma.video.update({
            where: { id: video.id },
            data: {
              status: "READY",
              hlsPath: `videos/hls/${id}/playlist.m3u8`,
              thumbnailPath: `videos/thumbnails/${id}.jpg`,
              duration,
            },
          })
        )
        .catch(async () => {
          await prisma.video.update({ where: { id: video.id }, data: { status: "ERROR" } })
        })

      console.log(`[synthesia]   ✓ Queued for transcoding (slug: ${slug})`)
      imported++
    } catch (err: unknown) {
      console.error(`[synthesia]   ✗ Error: ${err instanceof Error ? err.message : err}`)
      errors++
    }
  }

  console.log(`\n[synthesia] Done. Imported: ${imported}  Skipped: ${skipped}  Errors: ${errors}`)
  console.log("[synthesia] Videos are transcoding in the background — check /admin/videos")

  // Wait a bit for background transcoding to at least start
  await new Promise((r) => setTimeout(r, 2000))
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
