import { NextRequest, NextResponse } from "next/server"
import { searchArticles } from "@/lib/search"
import { isValidLocale, defaultLocale } from "@/lib/i18n"

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
    return NextResponse.json({ results })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ results: [] })
  }
}
