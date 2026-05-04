import { NextRequest, NextResponse } from "next/server"

/**
 * Proxy HubSpot-hosted images that articles still reference.
 *
 * Articles contain image URLs like:
 *   /hubfs/image-png-...png
 *   /hs-fs/hubfs/image-png-...png
 *
 * The old HubSpot Knowledge Base was at support.dataandmore.com.
 * HubSpot still serves these files via their CDN — we just need to
 * fetch from the hs-sites domain with the original Host header.
 */

const HUBSPOT_ORIGIN = "https://support.dataandmore.com.hs-sites.com"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const imagePath = path.join("/")

  // Reconstruct the original path — the rewrite strips /hubfs/ or /hs-fs/hubfs/
  // so we need to add it back
  const originalUrl = req.nextUrl.pathname
  let hubspotPath: string
  if (originalUrl.includes("/hs-fs/hubfs/")) {
    hubspotPath = `/hs-fs/hubfs/${imagePath}`
  } else {
    hubspotPath = `/hubfs/${imagePath}`
  }

  try {
    const res = await fetch(`${HUBSPOT_ORIGIN}${hubspotPath}`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      redirect: "follow",
    })

    if (res.ok && res.body) {
      const contentType = res.headers.get("content-type") ?? "image/png"
      return new NextResponse(res.body, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      })
    }
  } catch {
    // Fall through to fallback
  }

  // Return transparent 1x1 PNG as fallback
  const TRANSPARENT_PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJREFUeJztzDEOgCAQAMAFwf9/0MZoYcEJJnZO8gAAsA0AQDB4BwAAAABJRU5ErkJggg==",
    "base64"
  )
  return new NextResponse(TRANSPARENT_PNG, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
