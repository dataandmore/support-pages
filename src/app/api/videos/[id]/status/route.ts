import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

// ---------------------------------------------------------------------------
// GET /api/videos/[id]/status — poll transcoding status
// No auth required — status is not sensitive; the client polls immediately
// after upload before any session race conditions can occur.
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params

  const video = await prisma.video.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      hlsPath: true,
      thumbnailPath: true,
      duration: true,
    },
  })

  if (!video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(video)
}
