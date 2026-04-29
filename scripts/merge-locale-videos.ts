/**
 * Merge locale-specific Synthesia videos into their EN parent videos.
 *
 * The Synthesia import created separate Video records per language. This script:
 * 1. Finds locale-specific videos (DA/SV/DE only, no EN translation)
 * 2. Matches each to its EN parent by comparing translated titles
 * 3. Copies the synthesiaId into the parent's VideoTranslation for that locale
 * 4. Deletes the now-redundant locale-specific Video record
 *
 * Run: npx tsx scripts/merge-locale-videos.ts
 * Flags:
 *   --dry-run   Show what would be merged without writing
 */

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
if (!dbUrl) { console.error("DATABASE_URL not set"); process.exit(1) }

const adapter = new PrismaPg({ connectionString: dbUrl })
const prisma = new PrismaClient({ adapter })

const DRY_RUN = process.argv.includes("--dry-run")

async function main() {
  // Get all EN parent videos with their translations
  const enVideos = await prisma.video.findMany({
    where: { translations: { some: { locale: "en" } } },
    include: { translations: true },
  })

  // Get locale-specific videos (no EN translation)
  const localeVideos = await prisma.video.findMany({
    where: { translations: { none: { locale: "en" } } },
    include: { translations: true },
  })

  console.log(`EN parent videos: ${enVideos.length}`)
  console.log(`Locale-specific videos to merge: ${localeVideos.length}\n`)

  // Build lookups to match locale videos to EN parents
  // 1. Match by locale+title on existing translations
  const parentByLocaleTitle = new Map<string, { videoId: string; enTitle: string }>()
  // 2. Match by EN title (for product names that stay the same across locales)
  const parentByEnTitle = new Map<string, { videoId: string; enTitle: string }>()

  for (const v of enVideos) {
    const enTitle = v.translations.find(tr => tr.locale === "en")?.title ?? ""
    for (const t of v.translations) {
      const key = `${t.locale}:${t.title.toLowerCase()}`
      parentByLocaleTitle.set(key, { videoId: v.id, enTitle })
    }
    parentByEnTitle.set(enTitle.toLowerCase(), { videoId: v.id, enTitle })
  }

  // Hardcoded reverse mapping from the old translate-videos.ts script
  // Maps translated title → EN base title for titles that differ between scripts
  const reverseTranslations: Record<string, string> = {
    // DA (both old and variant translations)
    "oversigt over data minimization manager": "Product | Data Minimization Manager Overview",
    "opsætningsguide til privacy manager": "Privacy Manager Setup Guide",
    "klassificering af dataprivathed": "Data Privacy Classification",
    "værktøj til personlig kontosletning": "Personal Account Deletion Tool",
    "mestring af privatlivsbeskyttelse med værktøjet til personlig datasletning": "Mastering Privacy with the Personal Data Deletion Tool",
    "produkt | oversigt over data minimization manager": "Product | Data Minimization Manager Overview",
    "d&m til purview": "DAM for Purview",
    // SV (both old and variant translations)
    "översikt över data minimization manager": "Product | Data Minimization Manager Overview",
    "installationsguide för privacy manager": "Privacy Manager Setup Guide",
    "klassificering av dataintegritet": "Data Privacy Classification",
    "verktyg för personlig kontoborttagning": "Personal Account Deletion Tool",
    "bemästra integritetsskydd med verktyget för personlig databorttagning": "Mastering Privacy with the Personal Data Deletion Tool",
    "produkt | översikt över data minimization manager": "Product | Data Minimization Manager Overview",
    // DE (both old and variant translations)
    "überblick über den data minimization manager": "Product | Data Minimization Manager Overview",
    "überblick über data minimization manager": "Product | Data Minimization Manager Overview",
    "einrichtungsanleitung für den privacy manager": "Privacy Manager Setup Guide",
    "klassifizierung des datenschutzes": "Data Privacy Classification",
    "tool zur persönlichen kontolöschung": "Personal Account Deletion Tool",
    "datenschutz meistern mit dem tool zur persönlichen datenlöschung": "Mastering Privacy with the Personal Data Deletion Tool",
    "produkt | überblick über den data minimization manager": "Product | Data Minimization Manager Overview",
    "einführung in die data & more privacy platform": "Introduction to the D&M Privacy Platform",
  }

  let merged = 0
  let unmatched = 0

  for (const localeVideo of localeVideos) {
    const t = localeVideo.translations[0]
    if (!t || !localeVideo.synthesiaId) {
      console.log(`  ⚠ Skip (no translation or synthesiaId): ${localeVideo.id}`)
      continue
    }

    const key = `${t.locale}:${t.title.toLowerCase()}`
    let parent = parentByLocaleTitle.get(key)

    // If no direct match, try reverse translation lookup
    if (!parent) {
      const enBase = reverseTranslations[t.title.toLowerCase()]
      if (enBase) {
        parent = parentByEnTitle.get(enBase.toLowerCase())
      }
    }

    // Last resort: try matching by the title itself (product names unchanged across locales)
    if (!parent) {
      parent = parentByEnTitle.get(t.title.toLowerCase())
    }

    if (!parent) {
      console.log(`  ⚠ No match for [${t.locale}] "${t.title}"`)
      unmatched++
      continue
    }

    if (DRY_RUN) {
      console.log(`  Would merge [${t.locale}] "${t.title}" → parent "${parent.enTitle}" (synthesiaId: ${localeVideo.synthesiaId})`)
    } else {
      // Update the parent's translation with the locale-specific synthesiaId
      await prisma.videoTranslation.update({
        where: {
          videoId_locale: { videoId: parent.videoId, locale: t.locale as "en" | "da" | "sv" | "de" },
        },
        data: { synthesiaId: localeVideo.synthesiaId },
      })

      // Delete the locale-specific video (cascade deletes its translations)
      await prisma.video.delete({ where: { id: localeVideo.id } })

      console.log(`  ✓ Merged [${t.locale}] "${t.title}" → "${parent.enTitle}" (synthesiaId: ${localeVideo.synthesiaId})`)
    }
    merged++
  }

  console.log(`\n✓ Done! Merged: ${merged}, Unmatched: ${unmatched}`)
  if (unmatched > 0) {
    console.log("  Unmatched videos may have different translated titles — check manually.")
  }
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
