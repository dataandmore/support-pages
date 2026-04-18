import { prisma } from "@/lib/prisma"
import { isValidLocale, defaultLocale } from "@/lib/i18n"
import { CategoryCard } from "@/components/public/CategoryCard"
import { Header } from "@/components/public/Header"
import { Footer } from "@/components/public/Footer"
import { SearchBar } from "@/components/public/SearchBar"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Support Center",
  description:
    "Find answers, guides, and tutorials for all Data & More products.",
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const validLocale = isValidLocale(locale) ? locale : defaultLocale

  const categories = await prisma.category.findMany({
    orderBy: { position: "asc" },
    include: {
      translations: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { locale: validLocale as any },
      },
      _count: { select: { articles: true } },
    },
  })

  const heroText: Record<string, string> = {
    en: "How can we help?",
    da: "Hvordan kan vi hjælpe?",
    sv: "Hur kan vi hjälpa dig?",
    de: "Wie können wir helfen?",
  }

  const subText: Record<string, string> = {
    en: "Search our knowledge base or browse the categories below",
    da: "Søg i vores vidensbase eller gennemse kategorierne nedenfor",
    sv: "Sök i vår kunskapsbas eller bläddra bland kategorierna nedan",
    de: "Durchsuchen Sie unsere Wissensdatenbank oder stöbern Sie in den Kategorien",
  }

  const categoryLabel: Record<string, string> = {
    en: "Browse topics",
    da: "Gennemse emner",
    sv: "Bläddra bland ämnen",
    de: "Themen durchsuchen",
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header — hide its own search since hero has one */}
      <Header locale={validLocale} hideSearch />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white pt-14 pb-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">
            {heroText[validLocale] ?? heroText.en}
          </h1>
          <p className="text-blue-200 mb-8 text-base sm:text-lg">
            {subText[validLocale] ?? subText.en}
          </p>
          <SearchBar locale={validLocale} />
        </div>
      </section>

      {/* Category grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">
          {categoryLabel[validLocale] ?? categoryLabel.en}
        </h2>
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} locale={validLocale} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-16">
            No categories yet — check back soon.
          </p>
        )}
      </section>

      <Footer />
    </div>
  )
}
