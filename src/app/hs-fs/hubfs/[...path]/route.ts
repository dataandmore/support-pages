import { NextRequest, NextResponse } from "next/server"

/**
 * Proxy legacy HubSpot image paths to HubSpot's CDN.
 *
 * Articles imported from HubSpot reference images at /hs-fs/hubfs/…
 * which no longer resolve since the domain now points to this Next.js app.
 * This route fetches them from HubSpot's CDN and streams them back,
 * with aggressive caching so each image is only fetched once.
 */

const HUBSPOT_CDN = "https://f.hubspotusercontent20.net/hubfs/4381120"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const imagePath = path.join("/")
  const upstream = `${HUBSPOT_CDN}/${imagePath}`

  try {
    const res = await fetch(upstream, { next: { revalidate: 86400 } })

    if (!res.ok) {
      return new NextResponse(null, { status: res.status })
    }

    const contentType = res.headers.get("content-type") ?? "application/octet-stream"
    const body = res.body

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return new NextResponse(null, { status: 502 })
  }
}
