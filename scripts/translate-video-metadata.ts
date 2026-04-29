/**
 * Translate video titles and descriptions to DA/SV/DE using the Anthropic API.
 *
 * 1. Creates EN translations for videos that have none (uses originalFilename as title)
 * 2. Translates EN title+description → DA/SV/DE
 *
 * Run: npx tsx scripts/translate-video-metadata.ts
 * Flags:
 *   --force     Re-translate existing translations
 *   --dry-run   Show what would be translated without writing
 */

import Anthropic from "@anthropic-ai/sdk"
import fs from "fs"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

// ─── Env loader ───────────────────────────────────────────────────────────────
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

const FORCE = process.argv.includes("--force")
const DRY_RUN = process.argv.includes("--dry-run")

type Locale = "da" | "sv" | "de"
const TARGET_LOCALES: Locale[] = ["da", "sv", "de"]

const LOCALE_INSTRUCTIONS: Record<Locale, string> = {
  da: "Danish (Dansk). Use formal business language.",
  sv: "Swedish (Svenska). Use formal business language.",
  de: "German (Deutsch). Use formal business language (Sie/Ihnen).",
}

// ─── Translation via Claude ───────────────────────────────────────────────────

async function translateText(
  title: string,
  description: string | null,
  locale: Locale,
): Promise<{ title: string; description: string | null }> {
  const descPart = description
    ? `\n\nDescription (translate this too):\n${description}`
    : ""

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Translate the following video title${description ? " and description" : ""} to ${LOCALE_INSTRUCTIONS[locale]}

Keep product names (Data & More, Privacy Platform, DataSubject Manager™, etc.) in English.
Keep technical terms that don't have standard translations.
Return ONLY a JSON object with "title" and "description" keys. No markdown, no explanation.

Title: ${title}${descPart}`,
      },
    ],
  })

  const text = msg.content[0].type === "text" ? msg.content[0].text : ""
  try {
    const parsed = JSON.parse(text.replace(/```json?\n?|\n?```/g, "").trim())
    return {
      title: parsed.title || title,
      description: parsed.description ?? null,
    }
  } catch {
    console.error(`  ⚠ Failed to parse response for [${locale}]: ${text.slice(0, 100)}`)
    return { title, description }
  }
}

// ─── Synthesia API ────────────────────────────────────────────────────────────

const SYNTHESIA_API_KEY = envVars.SYNTHESIA_API_KEY || process.env.SYNTHESIA_API_KEY

const LOCALE_PREFIXES: [string, string][] = [
  ["DA - ", "da"], ["SV - ", "sv"], ["DE - ", "de"],
  ["HR - ", "hr"], ["EN - ", "en"],
]

function parseLocaleAndBase(title: string): { locale: string; base: string } {
  for (const [prefix, locale] of LOCALE_PREFIXES) {
    if (title.startsWith(prefix)) {
      return { locale, base: title.slice(prefix.length).trim() }
    }
  }
  return { locale: "en", base: title }
}

async function fetchSynthesiaTitles(): Promise<Map<string, { title: string; description: string | null }>> {
  const map = new Map<string, { title: string; description: string | null }>()
  if (!SYNTHESIA_API_KEY) {
    console.log("  ⚠ SYNTHESIA_API_KEY not set, skipping Synthesia title fetch")
    return map
  }

  const res = await fetch("https://api.synthesia.io/v2/videos?limit=100", {
    headers: { Authorization: SYNTHESIA_API_KEY },
  })
  if (!res.ok) {
    console.log(`  ⚠ Synthesia API error ${res.status}, skipping`)
    return map
  }

  const data = await res.json() as { videos: Array<{ id: string; title: string; description?: string }> }
  for (const v of data.videos) {
    const { locale, base } = parseLocaleAndBase(v.title)
    // Only use EN titles for creating missing EN translations
    if (locale === "en") {
      map.set(v.id, { title: base, description: v.description ?? null })
    }
  }
  console.log(`  Fetched ${map.size} EN titles from Synthesia API`)
  return map
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const videos = await prisma.video.findMany({
    include: { translations: true },
    orderBy: { createdAt: "desc" },
  })

  console.log(`Found ${videos.length} videos\n`)

  // Step 1: Ensure all videos have an EN translation
  console.log("── Step 1: Ensure EN translations exist ──")

  // Fetch titles from Synthesia for videos missing EN
  const synthesiaTitles = await fetchSynthesiaTitles()
  let enCreated = 0

  for (const video of videos) {
    const hasEn = video.translations.some((t) => t.locale === "en")
    if (hasEn) continue

    // Skip locale-specific Synthesia videos (DA/SV/DE versions that already
    // have their correct locale translation — they don't need EN).
    const hasNonEn = video.translations.some((t) => t.locale !== "en")
    if (hasNonEn) {
      console.log(`  Skip (locale-specific): ${video.originalFilename} [${video.translations.map(t => t.locale).join(",")}]`)
      continue
    }

    // Try to get title from Synthesia API
    let title: string
    let description: string | null = null

    if (video.synthesiaId && synthesiaTitles.has(video.synthesiaId)) {
      const synthData = synthesiaTitles.get(video.synthesiaId)!
      title = synthData.title
      description = synthData.description
    } else {
      // Fallback: clean up filename
      title = video.originalFilename
        .replace(/\.(mp4|mov|webm|mkv)$/i, "")
      if (title.startsWith("synthesia-")) {
        title = "Untitled Synthesia Video"
      }
    }

    if (DRY_RUN) {
      console.log(`  Would create EN: "${title}" for ${video.id}`)
    } else {
      await prisma.videoTranslation.create({
        data: {
          videoId: video.id,
          locale: "en",
          title,
          description,
        },
      })
      console.log(`  ✓ Created EN: "${title}"`)
    }
    enCreated++
  }
  console.log(`  ${enCreated} EN translations ${DRY_RUN ? "would be " : ""}created\n`)

  // Reload videos with fresh translations
  const freshVideos = DRY_RUN
    ? videos
    : await prisma.video.findMany({
        include: { translations: true },
        orderBy: { createdAt: "desc" },
      })

  // Step 2: Translate EN → DA/SV/DE
  console.log("── Step 2: Translate to DA/SV/DE ──")
  let translated = 0
  let skipped = 0

  for (const video of freshVideos) {
    const enTranslation = video.translations.find((t) => t.locale === "en")
    if (!enTranslation) {
      // Locale-specific video — skip silently
      continue
    }

    for (const locale of TARGET_LOCALES) {
      const existing = video.translations.find((t) => t.locale === locale)
      if (existing && !FORCE) {
        skipped++
        continue
      }

      if (DRY_RUN) {
        console.log(`  Would translate [${locale}]: "${enTranslation.title}"`)
        translated++
        continue
      }

      console.log(`  Translating [${locale}]: "${enTranslation.title}"...`)
      const result = await translateText(
        enTranslation.title,
        enTranslation.description,
        locale,
      )

      await prisma.videoTranslation.upsert({
        where: {
          videoId_locale: { videoId: video.id, locale },
        },
        create: {
          videoId: video.id,
          locale,
          title: result.title,
          description: result.description,
        },
        update: {
          title: result.title,
          description: result.description,
        },
      })

      console.log(`  ✓ [${locale}] "${result.title}"`)
      translated++

      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  console.log(`\n✓ Done! Translated: ${translated}, Skipped: ${skipped}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
