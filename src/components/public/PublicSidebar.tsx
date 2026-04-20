import { prisma } from "@/lib/prisma"
import { isValidLocale, defaultLocale } from "@/lib/i18n"
import { CollapsibleSidebar } from "./CollapsibleSidebar"

interface PublicSidebarProps {
  locale: string
}

/**
 * Server component: fetches categories and passes them to the
 * client-side CollapsibleSidebar which owns all toggle/animation state.
 */
export async function PublicSidebar({ locale }: PublicSidebarProps) {
  const validLocale = isValidLocale(locale) ? locale : defaultLocale

  const categories = await prisma.category.findMany({
    orderBy: { position: "asc" },
    include: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      translations: { where: { locale: validLocale as any } },
      _count: { select: { articles: true } },
      articles: {
        orderBy: { position: "asc" },
        where: {
          translations: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            some: { locale: validLocale as any, status: "PUBLISHED" },
          },
        },
        include: {
          translations: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where: { locale: validLocale as any, status: "PUBLISHED" },
            select: { title: true },
          },
        },
      },
    },
  })

  const navLabels: Record<string, { home: string; videos: string; kb: string }> = {
    en: { home: "Home", videos: "Videos", kb: "Knowledge base" },
    da: { home: "Hjem", videos: "Videoer", kb: "Vidensbase" },
    sv: { home: "Hem", videos: "Videor", kb: "Kunskapsbas" },
    de: { home: "Start", videos: "Videos", kb: "Wissensdatenbank" },
  }
  const labels = navLabels[validLocale] ?? navLabels.en

  return (
    <CollapsibleSidebar
      categories={categories.map((cat) => ({
        id: cat.id,
        slug: cat.slug,
        translations: cat.translations,
        _count: cat._count,
        icon: cat.icon ?? undefined,
        articles: cat.articles
          .filter((a) => a.translations.length > 0)
          .map((a) => ({
            slug: a.slug,
            title: a.translations[0]?.title ?? a.slug,
          })),
      }))}
      locale={validLocale}
      labels={labels}
    />
  )
}
