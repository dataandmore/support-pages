import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { transcodeToHLS } from "@/lib/ffmpeg"
import path from "path"
import fs from "fs/promises"

function slugify(s: string): string {
  return s
    .toLowerCase()
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

interface ImportItem {
  id: string        // Synthesia video ID
  title: string
  download: string  // mp4 URL
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const apiKey = process.env.SYNTHESIA_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "SYNTHESIA_API_KEY not configured" }, { status: 400 })
  }

  const { videos } = (await req.json()) as { videos: ImportItem[] }
  if (!Array.isArray(videos) || videos.length === 0) {
    return NextResponse.json({ error: "No videos provided" }, { status: 400 })
  }

  const results: { title: string; status: "queued" | "skipped" | "error"; reason?: string }[] = []

  const originalsDir = path.join(process.cwd(), "uploads", "videos", "originals")
  const thumbnailsDir = path.join(process.cwd(), "uploads", "videos", "thumbnails")
  await fs.mkdir(originalsDir, { recursive: true })
  await fs.mkdir(thumbnailsDir, { recursive: true })

  for (const item of videos) {
    // Skip if a video with this Synthesia ID already exists (stored in originalFilename)
    const existing = await prisma.video.findFirst({
      where: { originalFilename: { contains: item.id } },
    })
    if (existing) {
      results.push({ title: item.title, status: "skipped", reason: "already imported" })
      continue
    }

    try {
      // Download the MP4 from Synthesia
      const dlRes = await fetch(item.download, { headers: { Authorization: apiKey } })
      if (!dlRes.ok) throw new Error(`Download failed: HTTP ${dlRes.status}`)

      const buffer = Buffer.from(await dlRes.arrayBuffer())
      const id = crypto.randomUUID()
      const filename = `${id}-synthesia-${item.id}.mp4`
      const originalPath = path.join(originalsDir, filename)
      const thumbnailPath = path.join(thumbnailsDir, `${id}.jpg`)
      const hlsOutputDir = path.join(process.cwd(), "uploads", "videos", "hls", id)

      await fs.writeFile(originalPath, buffer)

      const slug = await uniqueSlug(slugify(item.title || `synthesia-${item.id}`))

      // Create DB record
      const video = await prisma.video.create({
        data: {
          id,
          slug,
          filename,
          originalFilename: `synthesia-${item.id}.mp4`,
          size: BigInt(buffer.length),
          status: "PROCESSING",
          translations: {
            create: {
              locale: "en",
              title: item.title,
              description: null,
            },
          },
        },
      })

      // Transcode in background — don't await
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
        .catch(() =>
          prisma.video.update({ where: { id: video.id }, data: { status: "ERROR" } })
        )

      results.push({ title: item.title, status: "queued" })
    } catch (err: unknown) {
      results.push({
        title: item.title,
        status: "error",
        reason: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  return NextResponse.json({ results })
}
