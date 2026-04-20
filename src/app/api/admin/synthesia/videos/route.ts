import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const SYNTHESIA_API = "https://api.synthesia.io/v2/videos"

export interface SynthesiaVideo {
  id: string
  title: string
  status: string          // "complete" | "in_progress" | "failed"
  download: string | null // mp4 download URL (only when complete)
  thumbnail: string | null
  duration: number | null
  created_at: number
}

/** Fetch all pages from Synthesia's list endpoint. */
async function fetchAllSynthesiaVideos(apiKey: string): Promise<SynthesiaVideo[]> {
  const all: SynthesiaVideo[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const url = `${SYNTHESIA_API}?limit=${limit}&offset=${offset}`
    const res = await fetch(url, {
      headers: { Authorization: apiKey },
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Synthesia API error ${res.status}: ${text}`)
    }

    const data = await res.json()
    // Synthesia returns { videos: [...] } or a flat array depending on API version
    const page: SynthesiaVideo[] = Array.isArray(data) ? data : (data.videos ?? [])
    all.push(...page)

    if (page.length < limit) break
    offset += limit
  }

  return all
}

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const apiKey = process.env.SYNTHESIA_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "SYNTHESIA_API_KEY is not configured. Add it in Settings." },
      { status: 400 }
    )
  }

  try {
    const videos = await fetchAllSynthesiaVideos(apiKey)
    return NextResponse.json({ videos })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch Synthesia videos" },
      { status: 502 }
    )
  }
}
