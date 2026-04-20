import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

// ---------------------------------------------------------------------------
// DELETE /api/media/[id] — delete a media item (ADMIN or EDITOR only)
// ---------------------------------------------------------------------------

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const media = await prisma.media.findUnique({ where: { id } })
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Delete from DB.
  await prisma.media.delete({ where: { id } })

  // Delete file from disk — best effort.
  try {
    const filePath = path.join(process.cwd(), "uploads", "images", media.filename)
    await fs.unlink(filePath)
  } catch { /* ignore */ }

  return NextResponse.json({ success: true })
}
