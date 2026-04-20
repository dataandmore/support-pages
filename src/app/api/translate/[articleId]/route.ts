import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { translateArticle } from "@/lib/translate"
import { isValidLocale, locales } from "@/lib/i18n"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params
    const { targetLocale } = await req.json()

    // Validate locale
    if (!isValidLocale(targetLocale) || targetLocale === "en") {
      return NextResponse.json({ error: "Invalid target locale" }, { status: 400 })
    }

    // Load the English source translation
    const source = await prisma.articleTranslation.findUnique({
      where: { articleId_locale: { articleId, locale: "en" } },
    })
    if (!source) {
      return NextResponse.json({ error: "Source article not found" }, { status: 404 })
    }

    // Check if a real translation already exists (don't re-translate)
    const existing = await prisma.articleTranslation.findUnique({
      where: { articleId_locale: { articleId, locale: targetLocale as (typeof locales)[number] } },
    })
    // Only skip if it has different content from English (i.e. already properly translated)
    // We always re-translate on explicit request

    // Call Anthropic
    const result = await translateArticle(source.title, source.content, targetLocale)

    // Upsert the translation
    await prisma.articleTranslation.upsert({
      where: { articleId_locale: { articleId, locale: targetLocale as (typeof locales)[number] } },
      create: {
        articleId,
        locale: targetLocale as (typeof locales)[number],
        title: result.title,
        content: result.content as object,
        excerpt: result.excerpt ?? source.excerpt,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      update: {
        title: result.title,
        content: result.content as object,
        excerpt: result.excerpt ?? source.excerpt,
        status: "PUBLISHED",
        publishedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[translate]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Translation failed" },
      { status: 500 }
    )
  }
}
