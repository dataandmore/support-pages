import { NextRequest, NextResponse } from "next/server"
import { searchArticles } from "@/lib/search"
import { isValidLocale, defaultLocale } from "@/lib/i18n"
import { prisma } from "@/lib/prisma"
import { hashSession } from "@/lib/analytics"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const query = searchParams.get("q") ?? ""
  const locale = searchParams.get("locale") ?? defaultLocale
  const validLocale = isValidLocale(locale) ? locale : defaultLocale

  if (!query.trim()) {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await searchArticles(query, validLocale)

    // Log search query (fire-and-forget)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
    const ua = req.headers.get("user-agent") ?? "unknown"
    prisma.searchQuery.create({
      data: {
        query: query.trim().substring(0, 200),
        locale: validLocale,
        resultCount: results.length,
        sessionHash: hashSession(ip, ua),
      },
    }).catch(() => {})

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ results: [] })
  }
}
