import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isValidLocale, defaultLocale } from "@/lib/i18n"

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale") ?? defaultLocale
  const validLocale = isValidLocale(locale) ? locale : defaultLocale
  const categorySlug = req.nextUrl.searchParams.get("category") ?? null

  const where: Record<string, unknown> = {
    translations: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      some: { locale: validLocale as any, status: "PUBLISHED" },
    },
  }

  if (categorySlug) {
    where.category = { slug: categorySlug }
  }

  const articles = await prisma.article.findMany({
    where,
    orderBy: { position: "asc" },
    include: {
      translations: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { locale: validLocale as any, status: "PUBLISHED" },
        select: { title: true, excerpt: true },
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
    },
  })

  const result = articles.map((a) => ({
    slug: a.slug,
    title: a.translations[0]?.title ?? a.slug,
    excerpt: a.translations[0]?.excerpt ?? null,
    category: a.category
      ? {
          slug: a.category.slug,
          name: a.category.translations[0]?.name ?? a.category.slug,
        }
      : null,
    tags: a.tags.map((t) => t.tag.name),
    pinned: a.pinned,
  }))

  return NextResponse.json({ articles: result })
}
