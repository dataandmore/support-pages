import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

function serializeVideo(video: Record<string, unknown>) {
  return {
    ...video,
    size: video.size !== null && video.size !== undefined
      ? String(video.size)
      : null,
  }
}

// ---------------------------------------------------------------------------
// GET /api/videos/[id]
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params

  const video = await prisma.video.findUnique({
    where: { id },
    include: { translations: true },
  })

  if (!video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({
    video: serializeVideo(video as unknown as Record<string, unknown>),
  })
}

// ---------------------------------------------------------------------------
// PATCH /api/videos/[id]
// Body: { locale?, title?, description?, isGated? }
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.video.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let body: {
    locale?: string
    title?: string
    description?: string
    isGated?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { locale, title, description, isGated } = body

  // Upsert translation when locale + title are provided.
  if (locale && title) {
    await prisma.videoTranslation.upsert({
      where: {
        videoId_locale: {
          videoId: id,
          locale: locale as "en" | "da" | "sv" | "de",
        },
      },
      create: {
        videoId: id,
        locale: locale as "en" | "da" | "sv" | "de",
        title,
        description: description ?? null,
      },
      update: {
        title,
        ...(description !== undefined ? { description } : {}),
      },
    })
  }

  // Update isGated flag on the video itself if provided.
  if (isGated !== undefined) {
    await prisma.video.update({ where: { id }, data: { isGated } })
  }

  const video = await prisma.video.findUnique({
    where: { id },
    include: { translations: true },
  })

  return NextResponse.json({
    video: serializeVideo(video as unknown as Record<string, unknown>),
  })
}

// ---------------------------------------------------------------------------
// DELETE /api/videos/[id]
// ---------------------------------------------------------------------------

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const video = await prisma.video.findUnique({ where: { id } })
  if (!video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Delete DB record (cascades to VideoTranslation via onDelete: Cascade).
  await prisma.video.delete({ where: { id } })

  // Delete files — best-effort, never throw on missing files.
  const originalsDir = path.join(process.cwd(), "uploads", "videos", "originals")
  const hlsDir = path.join(process.cwd(), "uploads", "videos", "hls", id)
  const thumbnailFile = path.join(
    process.cwd(),
    "uploads",
    "videos",
    "thumbnails",
    `${id}.jpg`
  )

  // Remove originals matching `{id}-*`
  try {
    const files = await fs.readdir(originalsDir)
    await Promise.all(
      files
        .filter((f) => f.startsWith(`${id}-`))
        .map((f) => fs.unlink(path.join(originalsDir, f)).catch(() => {}))
    )
  } catch { /* ignore */ }

  // Remove HLS directory.
  try {
    await fs.rm(hlsDir, { recursive: true, force: true })
  } catch { /* ignore */ }

  // Remove thumbnail.
  try {
    await fs.unlink(thumbnailFile)
  } catch { /* ignore */ }

  return NextResponse.json({ success: true })
}
