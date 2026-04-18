import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { transcodeToHLS } from "@/lib/ffmpeg"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")       // strip file extension
    .replace(/[^a-z0-9]+/g, "-")   // non-alphanumeric → dash
    .replace(/^-|-$/g, "")         // trim leading/trailing dashes
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base
  let counter = 2
  while (await prisma.video.findUnique({ where: { slug } })) {
    slug = `${base}-${counter++}`
  }
  return slug
}

// Prisma returns BigInt for size — serialize to string for JSON.
function serializeVideo(video: Record<string, unknown>) {
  return {
    ...video,
    size: video.size !== null && video.size !== undefined
      ? String(video.size)
      : null,
  }
}

// ---------------------------------------------------------------------------
// GET /api/videos — list all videos with translations
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const videos = await prisma.video.findMany({
    include: { translations: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    videos: videos.map((v) => serializeVideo(v as unknown as Record<string, unknown>)),
  })
}

// ---------------------------------------------------------------------------
// POST /api/videos — upload a video (ADMIN or EDITOR only)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }
  if (!file.type.startsWith("video/")) {
    return NextResponse.json(
      { error: `Invalid file type: ${file.type}. Must be video/*` },
      { status: 400 }
    )
  }

  // Generate a stable ID for this upload using Node's built-in crypto.
  const id = crypto.randomUUID()

  const originalFilename = file.name
  const slug = await uniqueSlug(slugify(originalFilename))

  // Absolute paths derived from process.cwd() (project root at runtime).
  const originalsDir = path.join(process.cwd(), "uploads", "videos", "originals")
  const thumbnailsDir = path.join(process.cwd(), "uploads", "videos", "thumbnails")
  const originalPath = path.join(originalsDir, `${id}-${originalFilename}`)
  const thumbnailPath = path.join(thumbnailsDir, `${id}.jpg`)
  const hlsOutputDir = path.join(process.cwd(), "uploads", "videos", "hls", id)

  // Ensure directories exist.
  await fs.mkdir(originalsDir, { recursive: true })
  await fs.mkdir(thumbnailsDir, { recursive: true })

  // Write the uploaded bytes to disk.
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(originalPath, buffer)

  // Create DB record immediately with UPLOADING status.
  const video = await prisma.video.create({
    data: {
      id,
      slug,
      filename: `${id}-${originalFilename}`,
      originalFilename,
      size: BigInt(file.size),
      status: "UPLOADING",
    },
    include: { translations: true },
  })

  // Fire-and-forget: transcode in the background.
  // First update status to PROCESSING so the UI can show progress.
  prisma.video
    .update({ where: { id }, data: { status: "PROCESSING" } })
    .then(() => transcodeToHLS(originalPath, hlsOutputDir, thumbnailPath))
    .then(({ duration }) =>
      prisma.video.update({
        where: { id },
        data: {
          status: "READY",
          hlsPath: `videos/hls/${id}/playlist.m3u8`,
          thumbnailPath: `videos/thumbnails/${id}.jpg`,
          duration,
        },
      })
    )
    .catch(() =>
      prisma.video.update({
        where: { id },
        data: { status: "ERROR" },
      })
    )

  // Return 202 Accepted — client polls /api/videos/{id}/status for progress.
  return NextResponse.json(
    { video: serializeVideo(video as unknown as Record<string, unknown>) },
    { status: 202 }
  )
}
