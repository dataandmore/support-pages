import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { translateArticle } from "@/lib/translate"
import { z } from "zod"

const Schema = z.object({
  articleId: z.string(),
  targetLocale: z.enum(["da", "sv", "de"]),
  title: z.string(),
  content: z.any(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { articleId, targetLocale, title, content } = parsed.data

  try {
    const translation = await translateArticle(title, content, targetLocale)

    await prisma.articleTranslation.upsert({
      where: {
        articleId_locale: { articleId, locale: targetLocale as "en" | "da" | "sv" | "de" },
      },
      create: {
        articleId,
        locale: targetLocale as "en" | "da" | "sv" | "de",
        title: translation.title,
        content: translation.content as object,
        excerpt: translation.excerpt,
        status: "AI_DRAFT",
        translatedBy: session.user.id,
      },
      update: {
        title: translation.title,
        content: translation.content as object,
        excerpt: translation.excerpt,
        status: "AI_DRAFT",
        translatedBy: session.user.id,
      },
    })

    return NextResponse.json({ translation })
  } catch (error) {
    console.error("Translation error:", error)
    return NextResponse.json({ error: "Translation failed" }, { status: 500 })
  }
}
