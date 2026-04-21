import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import path from "path"
import fs from "fs/promises"

const SYNTHESIA_API = "https://api.synthesia.io/v2/videos"

interface SynthesiaVideoInfo {
  id: string
  thumbnail: string | null
}

/**
 * POST /api/admin/synthesia/thumbnails
 *
 * Re-fetches thumbnail images from Synthesia for all videos whose
 * thumbnail file is missing on disk.
 */
export async function POST() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const apiKey = process.env.SYNTHESIA_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "SYNTHESIA_API_KEY not configured" }, { status: 400 })
  }

  // 1. Get all videos from DB that have a thumbnailPath
  const dbVideos = await prisma.video.findMany({
    where: { thumbnailPath: { not: null } },
    select: { id: true, originalFilename: true, thumbnailPath: true },
  })

  // 2. Fetch all videos from Synthesia API (paginated)
  const synthVideos: SynthesiaVideoInfo[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const res = await fetch(`${SYNTHESIA_API}?limit=${limit}&offset=${offset}`, {
      headers: { Authorization: apiKey },
      cache: "no-store",
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Synthesia API error: ${res.status}` },
        { status: 502 },
      )
    }
    const data = await res.json()
    const page = Array.isArray(data) ? data : (data.videos ?? [])
    synthVideos.push(...page)
    if (page.length < limit) break
    offset += limit
  }

  // 3. Build a lookup: synthesia ID → thumbnail URL
  const thumbMap = new Map<string, string>()
  for (const sv of synthVideos) {
    if (sv.thumbnail) thumbMap.set(sv.id, sv.thumbnail)
  }

  // 4. Download missing thumbnails
  const thumbnailsDir = path.join(process.cwd(), "uploads", "videos", "thumbnails")
  await fs.mkdir(thumbnailsDir, { recursive: true })

  const results: { id: string; status: "downloaded" | "skipped" | "not_found" | "error"; reason?: string }[] = []

  for (const dbv of dbVideos) {
    // Extract Synthesia ID from originalFilename: "synthesia-{uuid}.mp4"
    const match = dbv.originalFilename.match(/synthesia-([a-f0-9-]+)\.mp4/)
    if (!match) {
      results.push({ id: dbv.id, status: "skipped", reason: "not a Synthesia video" })
      continue
    }

    const synthId = match[1]
    const thumbUrl = thumbMap.get(synthId)
    if (!thumbUrl) {
      results.push({ id: dbv.id, status: "not_found", reason: `Synthesia ID ${synthId} not found in API` })
      continue
    }

    // Check if file already exists
    const destPath = path.join(process.cwd(), "uploads", dbv.thumbnailPath!)
    try {
      await fs.access(destPath)
      results.push({ id: dbv.id, status: "skipped", reason: "file already exists" })
      continue
    } catch {
      // File doesn't exist — download it
    }

    try {
      const imgRes = await fetch(thumbUrl)
      if (!imgRes.ok) {
        results.push({ id: dbv.id, status: "error", reason: `HTTP ${imgRes.status}` })
        continue
      }
      const buffer = Buffer.from(await imgRes.arrayBuffer())
      await fs.writeFile(destPath, buffer)
      results.push({ id: dbv.id, status: "downloaded" })
    } catch (err) {
      results.push({
        id: dbv.id,
        status: "error",
        reason: err instanceof Error ? err.message : "Unknown",
      })
    }
  }

  const downloaded = results.filter((r) => r.status === "downloaded").length
  const skipped = results.filter((r) => r.status === "skipped").length
  const notFound = results.filter((r) => r.status === "not_found").length
  const errors = results.filter((r) => r.status === "error").length

  return NextResponse.json({
    summary: { total: results.length, downloaded, skipped, notFound, errors },
    results,
  })
}
