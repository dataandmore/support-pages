import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { Readable } from "stream"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ path: string[] }> }

// Derive MIME type and cache policy from file extension.
function getMeta(ext: string): { contentType: string; cacheControl: string } {
  switch (ext) {
    case ".m3u8":
      return {
        contentType: "application/vnd.apple.mpegurl",
        cacheControl: "no-cache",            // playlist changes during transcode
      }
    case ".ts":
      return {
        contentType: "video/mp2t",
        cacheControl: "public, max-age=31536000, immutable", // segments are final
      }
    case ".jpg":
    case ".jpeg":
      return {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=86400",
      }
    case ".png":
      return {
        contentType: "image/png",
        cacheControl: "public, max-age=86400",
      }
    case ".webp":
      return {
        contentType: "image/webp",
        cacheControl: "public, max-age=86400",
      }
    case ".gif":
      return {
        contentType: "image/gif",
        cacheControl: "public, max-age=86400",
      }
    case ".svg":
      return {
        contentType: "image/svg+xml",
        cacheControl: "public, max-age=86400",
      }
    default:
      return {
        contentType: "application/octet-stream",
        cacheControl: "public, max-age=3600",
      }
  }
}

// Extract the video ID from the path segments.
// Path shape: ["videos", "hls", "{id}", "playlist.m3u8"] or ["videos", "hls", "{id}", "segment_000.ts"]
function extractVideoId(segments: string[]): string | null {
  const hlsIndex = segments.indexOf("hls")
  if (hlsIndex !== -1 && segments.length > hlsIndex + 1) {
    return segments[hlsIndex + 1]
  }
  return null
}

// ---------------------------------------------------------------------------
// GET /api/stream/[...path]
// Serves HLS playlists, segments, and thumbnails from the uploads directory.
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: Params) {
  const { path: pathSegments } = await params

  // Security: reject any segment containing ".." to prevent path traversal.
  if (pathSegments.some((seg) => seg.includes(".."))) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const filePath = path.join(process.cwd(), "uploads", ...pathSegments)
  const ext = path.extname(filePath).toLowerCase()
  const { contentType, cacheControl } = getMeta(ext)

  // For HLS content (.m3u8 and .ts), check if the video is gated.
  if (ext === ".m3u8" || ext === ".ts") {
    const videoId = extractVideoId(pathSegments)
    if (videoId) {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { isGated: true },
      })
      if (video?.isGated) {
        const session = await auth()
        if (!session) {
          return new NextResponse("Unauthorized", { status: 401 })
        }
      }
    }
  }

  // Check file exists.
  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 })
  }

  // Stream file via Node.js ReadableStream → Web ReadableStream.
  const nodeStream = fs.createReadStream(filePath)
  const webStream = Readable.toWeb(nodeStream) as ReadableStream

  return new Response(webStream, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
    },
  })
}
