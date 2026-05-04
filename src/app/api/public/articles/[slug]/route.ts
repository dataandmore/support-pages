import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isValidLocale, defaultLocale } from "@/lib/i18n"
import { tiptapToMarkdown } from "@/lib/tiptap-to-markdown"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const locale = req.nextUrl.searchParams.get("locale") ?? defaultLocale
  const validLocale = isValidLocale(locale) ? locale : defaultLocale

  const article = await prisma.article.findUnique({
    where: { slug },
    include: {
      translations: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { locale: validLocale as any, status: "PUBLISHED" },
      },
      category: {
        include: {
          translations: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where: { locale: validLocale as any },
            select: { name: true },
          },
        },
      },
      tags: {
        include: { tag: { select: { name: true } } },
      },
      relatedTo: {
        include: {
          relatedArticle: {
            include: {
              translations: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                where: { locale: validLocale as any, status: "PUBLISHED" },
                select: { title: true },
              },
            },
          },
        },
      },
    },
  })

  if (!article || article.translations.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const t = article.translations[0]
  const content = tiptapToMarkdown(t.content)

  return NextResponse.json({
    slug: article.slug,
    title: t.title,
    excerpt: t.excerpt,
    content,
    category: article.category
      ? {
          slug: article.category.slug,
          name: article.category.translations[0]?.name ?? article.category.slug,
        }
      : null,
    tags: article.tags.map((at) => at.tag.name),
    relatedArticles: article.relatedTo
      .filter((r) => r.relatedArticle.translations.length > 0)
      .map((r) => ({
        slug: r.relatedArticle.slug,
        title: r.relatedArticle.translations[0].title,
      })),
    publishedAt: t.publishedAt,
  })
}
