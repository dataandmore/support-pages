import { prisma } from "@/lib/prisma"
import { isValidLocale, defaultLocale } from "@/lib/i18n"
import { CategoryCard } from "@/components/public/CategoryCard"
import { Header } from "@/components/public/Header"
import { Footer } from "@/components/public/Footer"
import { HeroSearch } from "@/components/public/HeroSearch"
import { HeroVideo } from "@/components/public/HeroVideo"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Support Center",
  description: "Find answers, guides, and tutorials for all Data & More products.",
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
    en: "Browse by topic",
    da: "Gennemse emner",
    sv: "Bläddra bland ämnen",
    de: "Themen durchsuchen",
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f5f6f8" }}>
      <Header locale={validLocale} hideSearch />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ background: "#1a1a2c" }}>
        {/* Video background — cycles randomly through all 4 bg videos */}
        <HeroVideo />

        {/* Dark overlay over video (also serves as fallback when no video) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(26,26,44,0.95) 0%, rgba(42,28,14,0.90) 100%)",
          }}
        />

        {/* Orange top accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#EC6E1E]" />

        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#EC6E1E 1px, transparent 1px), linear-gradient(90deg, #EC6E1E 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Orange glow */}
        <div
          className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10 pointer-events-none"
          style={{
            background: "radial-gradient(circle, #EC6E1E 0%, transparent 70%)",
            transform: "translate(30%, 30%)",
          }}
        />

        <div className="relative z-10 max-w-2xl mx-auto px-4 text-center py-24 sm:py-32">
          <p className="text-[#EC6E1E] text-sm font-semibold uppercase tracking-widest mb-5">
            Data &amp; More Support
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-5 tracking-tight leading-tight">
            {heroText[validLocale] ?? heroText.en}
          </h1>
          <p className="text-white/50 mb-10 text-base sm:text-lg">
            {subText[validLocale] ?? subText.en}
          </p>
          <HeroSearch locale={validLocale} />
        </div>
      </section>

      {/* ── Category grid ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-7">
          {categoryLabel[validLocale] ?? categoryLabel.en}
        </p>

        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} locale={validLocale} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 text-gray-400">
            <p className="text-sm">No categories yet — check back soon.</p>
          </div>
        )}
      </section>

      <Footer />
    </div>
  )
}
