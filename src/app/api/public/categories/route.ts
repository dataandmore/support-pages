import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isValidLocale, defaultLocale } from "@/lib/i18n"

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale") ?? defaultLocale
  const validLocale = isValidLocale(locale) ? locale : defaultLocale

  const categories = await prisma.category.findMany({
    orderBy: { position: "asc" },
    where: { parentId: null },
    include: {
      translations: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { locale: validLocale as any },
      },
      _count: {
        select: {
          articles: {
            where: {
              translations: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                some: { locale: validLocale as any, status: "PUBLISHED" },
              },
            },
          },
        },
      },
      children: {
        orderBy: { position: "asc" },
        include: {
          translations: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where: { locale: validLocale as any },
          },
          _count: {
            select: {
              articles: {
                where: {
                  translations: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    some: { locale: validLocale as any, status: "PUBLISHED" },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const result = categories.map((cat) => ({
    slug: cat.slug,
    name: cat.translations[0]?.name ?? cat.slug,
    description: cat.translations[0]?.description ?? null,
    articleCount: cat._count.articles,
    children: cat.children.map((child) => ({
      slug: child.slug,
      name: child.translations[0]?.name ?? child.slug,
      description: child.translations[0]?.description ?? null,
      articleCount: child._count.articles,
    })),
  }))

  return NextResponse.json({ categories: result })
}
