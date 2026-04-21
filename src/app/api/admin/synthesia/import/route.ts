import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base
  let counter = 2
  while (await prisma.video.findUnique({ where: { slug } })) {
    slug = `${base}-${counter++}`
  }
  return slug
}

interface ImportItem {
  id: string          // Synthesia video ID
  title: string
  download: string    // mp4 URL (kept for interface compat, not used)
  thumbnail?: string  // Synthesia thumbnail URL
  duration?: number   // Duration in seconds
}

// ─── Language prefix detection ────────────────────────────────────────────────

const LOCALE_PREFIXES: [string, string][] = [
  ["DE (Germany) - ", "de"],
  ["DA - ", "da"],
  ["SV - ", "sv"],
  ["DE - ", "de"],
]

const SUPPORTED_LOCALES = new Set(["en", "da", "sv", "de"])

function parseLocaleAndBase(title: string): { locale: string; base: string } {
  for (const [prefix, locale] of LOCALE_PREFIXES) {
    if (title.startsWith(prefix)) {
      return { locale, base: title.slice(prefix.length).trim() }
    }
  }
  return { locale: "en", base: title }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { videos } = (await req.json()) as { videos: ImportItem[] }
  if (!Array.isArray(videos) || videos.length === 0) {
    return NextResponse.json({ error: "No videos provided" }, { status: 400 })
  }

  const results: { title: string; status: "imported" | "skipped" | "error"; reason?: string }[] = []

  for (const item of videos) {
    // Skip if a video with this Synthesia ID already exists
    const existing = await prisma.video.findUnique({
      where: { synthesiaId: item.id },
    })
    if (existing) {
      results.push({ title: item.title, status: "skipped", reason: "already imported" })
      continue
    }

    try {
      const { locale: parsedLocale, base: cleanTitle } = parseLocaleAndBase(item.title)
      const locale = SUPPORTED_LOCALES.has(parsedLocale) ? parsedLocale : "en"
      const slug = await uniqueSlug(slugify(cleanTitle || `synthesia-${item.id}`))

      await prisma.video.create({
        data: {
          slug,
          filename: `synthesia-${item.id}.mp4`,
          originalFilename: `synthesia-${item.id}.mp4`,
          size: BigInt(0),
          status: "READY",
          synthesiaId: item.id,
          thumbnailUrl: item.thumbnail ?? null,
          duration: item.duration ?? null,
          translations: {
            create: {
              locale: locale as "en" | "da" | "sv" | "de",
              title: cleanTitle,
              description: null,
            },
          },
        },
      })

      results.push({ title: item.title, status: "imported" })
    } catch (err: unknown) {
      results.push({
        title: item.title,
        status: "error",
        reason: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  return NextResponse.json({ results })
}
