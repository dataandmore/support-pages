import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isValidLocale, defaultLocale } from "@/lib/i18n"

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale") ?? defaultLocale
  const validLocale = isValidLocale(locale) ? locale : defaultLocale

  const videos = await prisma.video.findMany({
    where: {
      status: "READY",
      translations: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        some: { locale: validLocale as any },
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      translations: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { locale: validLocale as any },
      },
    },
  })

  const result = videos.map((v) => {
    const t = v.translations[0]
    return {
      slug: v.slug,
      title: t?.title ?? v.originalFilename,
      description: t?.description ?? null,
      duration: formatDuration(v.duration),
      pinned: v.pinned,
      isGated: v.isGated,
    }
  })

  return NextResponse.json({ videos: result })
}
