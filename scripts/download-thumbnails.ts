/**
 * Downloads Synthesia video thumbnails to public/thumbnails/ and updates
 * the thumbnailUrl field in the database.
 *
 * Run: DATABASE_URL="postgresql://..." npx tsx scripts/download-thumbnails.ts
 */

import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import fs from "fs/promises"
import path from "path"

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const THUMB_BASE = "https://69jr5v75rc.execute-api.eu-west-1.amazonaws.com/prod"
const OUT_DIR = path.join(process.cwd(), "public", "thumbnails")

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  const videos = await prisma.video.findMany({
    where: { synthesiaId: { not: null }, status: "READY" },
    select: { id: true, synthesiaId: true, thumbnailUrl: true },
  })

  console.log(`Found ${videos.length} Synthesia videos`)

  let downloaded = 0
  let skipped = 0
  let failed = 0

  for (const video of videos) {
    const synthId = video.synthesiaId!
    const filename = `${synthId}.jpg`
    const filePath = path.join(OUT_DIR, filename)
    const publicUrl = `/thumbnails/${filename}`

    // Skip if already downloaded and DB is up to date
    try {
      await fs.access(filePath)
      if (video.thumbnailUrl === publicUrl) {
        skipped++
        continue
      }
    } catch {
      // File doesn't exist — download it
    }

    try {
      const url = `${THUMB_BASE}/${synthId}/thumbnail.jpg`
      const res = await fetch(url, { redirect: "follow" })
      if (!res.ok) {
        console.log(`  ✗ ${synthId}: HTTP ${res.status}`)
        failed++
        continue
      }
      const buffer = Buffer.from(await res.arrayBuffer())
      await fs.writeFile(filePath, buffer)

      await prisma.video.update({
        where: { id: video.id },
        data: { thumbnailUrl: publicUrl },
      })

      console.log(`  ✓ ${synthId} (${Math.round(buffer.length / 1024)}KB)`)
      downloaded++
    } catch (err) {
      console.log(`  ✗ ${synthId}: ${err instanceof Error ? err.message : "Unknown error"}`)
      failed++
    }
  }

  console.log(`\nDone: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
