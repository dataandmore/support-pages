/**
 * Fix missing video descriptions:
 * 1. Generate EN descriptions for videos that don't have one (using Claude)
 * 2. Translate missing descriptions to DA/SV/DE
 *
 * Run: npx tsx scripts/fix-video-descriptions.ts
 * Or on server: docker exec with DATABASE_URL set
 */

import Anthropic from "@anthropic-ai/sdk"
import fs from "fs"
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
const apiKey = envVars.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY

if (!dbUrl) { console.error("DATABASE_URL not set"); process.exit(1) }
if (!apiKey) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1) }

const adapter = new PrismaPg({ connectionString: dbUrl })
const prisma = new PrismaClient({ adapter })
const anthropic = new Anthropic({ apiKey })

type Locale = "da" | "sv" | "de"
const TARGET_LOCALES: Locale[] = ["da", "sv", "de"]

const LOCALE_INSTRUCTIONS: Record<Locale, string> = {
  da: "Danish (Dansk). Use formal business language.",
  sv: "Swedish (Svenska). Use formal business language.",
  de: "German (Deutsch). Use formal business language (Sie/Ihnen).",
}

async function generateDescription(title: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: `Write a brief product video description (1-2 sentences) for a Data & More video titled "${title}".

Data & More is a data privacy and compliance platform that helps organizations manage personal data across Microsoft 365, Exchange, SharePoint, OneDrive, file shares, and more. Their products include Privacy Platform, Privacy Manager, Data Minimization Manager, DataSubject Manager, CoPilot Privacy Protection, DLP (Data Loss Prevention), and more.

Return ONLY the description text, no quotes, no labels.`,
    }],
  })
  return msg.content[0].type === "text" ? msg.content[0].text.trim() : ""
}

async function translateDescription(
  description: string,
  title: string,
  locale: Locale,
): Promise<string> {
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: `Translate this video description to ${LOCALE_INSTRUCTIONS[locale]}
Keep product names (Data & More, Privacy Platform, etc.) in English.
Return ONLY the translated text, no quotes, no labels.

Video title: ${title}
Description: ${description}`,
    }],
  })
  return msg.content[0].type === "text" ? msg.content[0].text.trim() : description
}

async function main() {
  const videos = await prisma.video.findMany({
    include: { translations: true },
    orderBy: { createdAt: "desc" },
  })

  console.log(`Found ${videos.length} videos\n`)

  // Step 1: Generate missing EN descriptions
  console.log("── Step 1: Generate missing EN descriptions ──")
  for (const video of videos) {
    const en = video.translations.find(t => t.locale === "en")
    if (!en || en.description) continue

    console.log(`  Generating: "${en.title}"...`)
    const description = await generateDescription(en.title)
    await prisma.videoTranslation.update({
      where: { id: en.id },
      data: { description },
    })
    console.log(`  ✓ "${description.slice(0, 80)}..."`)
    await new Promise(r => setTimeout(r, 200))
  }

  // Reload after EN updates
  const freshVideos = await prisma.video.findMany({
    include: { translations: true },
    orderBy: { createdAt: "desc" },
  })

  // Step 2: Translate missing descriptions to DA/SV/DE
  console.log("\n── Step 2: Fill missing locale descriptions ──")
  let translated = 0
  for (const video of freshVideos) {
    const en = video.translations.find(t => t.locale === "en")
    if (!en?.description) continue

    for (const locale of TARGET_LOCALES) {
      const t = video.translations.find(tr => tr.locale === locale)
      if (!t) continue
      if (t.description) continue

      console.log(`  Translating [${locale}]: "${en.title}"...`)
      const desc = await translateDescription(en.description, en.title, locale)
      await prisma.videoTranslation.update({
        where: { id: t.id },
        data: { description: desc },
      })
      console.log(`  ✓ [${locale}] done`)
      translated++
      await new Promise(r => setTimeout(r, 200))
    }
  }

  // Final stats
  const final = await prisma.videoTranslation.groupBy({
    by: ["locale"],
    _count: { description: true },
  })
  console.log("\n── Final description coverage ──")
  for (const row of final) {
    console.log(`  ${row.locale}: ${row._count.description}/${videos.length}`)
  }

  console.log(`\n✓ Done! Generated EN descriptions and translated ${translated} locale descriptions.`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
