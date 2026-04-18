import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"
import sharp from "sharp"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const UPLOADS_DIR = "uploads/images"
const MAX_WIDTH = 2000

// Supported image MIME types and their extensions.
const SUPPORTED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
}

// ---------------------------------------------------------------------------
// GET /api/media — list all media items
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const media = await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      uploader: { select: { name: true, email: true } },
    },
  })

  // Serialize BigInt size to string.
  const serialized = media.map((m) => ({
    ...m,
    size: String(m.size),
  }))

  return NextResponse.json({ media: serialized })
}

// ---------------------------------------------------------------------------
// POST /api/media — upload an image (ADMIN or EDITOR only)
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

  const ext = SUPPORTED[file.type]
  if (!ext) {
    return NextResponse.json(
      { error: `Unsupported image type: ${file.type}` },
      { status: 400 }
    )
  }

  const id = crypto.randomUUID()
  const filename = `${id}.${ext}`
  const uploadsDir = path.join(process.cwd(), UPLOADS_DIR)
  const filePath = path.join(uploadsDir, filename)

  await fs.mkdir(uploadsDir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())

  // Resize to max 2000px wide (no upscaling) — skip for SVG and GIF.
  let finalBuffer: Buffer
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    finalBuffer = buffer
  } else {
    finalBuffer = await sharp(buffer)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .toBuffer()
  }

  await fs.writeFile(filePath, finalBuffer)

  const url = `/api/stream/images/${filename}`

  const media = await prisma.media.create({
    data: {
      id,
      filename,
      originalFilename: file.name,
      mimetype: file.type,
      size: BigInt(finalBuffer.byteLength),
      url,
      uploadedBy: session.user.id ?? null,
    },
  })

  return NextResponse.json(
    { media: { ...media, size: String(media.size) } },
    { status: 201 }
  )
}
