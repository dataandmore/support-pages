import { prisma } from "@/lib/prisma"
import { isValidLocale, defaultLocale } from "@/lib/i18n"
import { CategoryCard } from "@/components/public/CategoryCard"
import { Header } from "@/components/public/Header"
import { Footer } from "@/components/public/Footer"
import { HeroSearch } from "@/components/public/HeroSearch"
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
    en: "Browse by topic",
    da: "Gennemse emner",
    sv: "Bläddra bland ämnen",
    de: "Themen durchsuchen",
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col">
      <Header locale={validLocale} hideSearch />

      {/* ── Hero with video background ── */}
      <section className="relative overflow-hidden text-white" style={{ minHeight: 360 }}>
        {/* Video background — place hero-video.mp4 in /public to activate */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>

        {/* Dark overlay — ensures text is legible over any video */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(26,26,44,0.92) 0%, rgba(42,42,60,0.88) 50%, rgba(62,40,20,0.85) 100%)",
          }}
        />

        {/* Orange accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#EC6E1E]" />

        {/* Content */}
        <div className="relative z-10 max-w-2xl mx-auto px-4 text-center py-20 sm:py-24">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight leading-tight">
            {heroText[validLocale] ?? heroText.en}
          </h1>
          <p className="text-white/70 mb-10 text-base sm:text-lg">
            {subText[validLocale] ?? subText.en}
          </p>
          <HeroSearch locale={validLocale} />
        </div>
      </section>

      {/* ── Category grid ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex-1 w-full">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">
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
            <p className="text-4xl mb-4">📚</p>
            <p className="text-sm">No categories yet — check back soon.</p>
          </div>
        )}
      </section>

      <Footer />
    </div>
  )
}
