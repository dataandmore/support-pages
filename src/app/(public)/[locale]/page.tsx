import Link from "next/link"
import { Pin, Play } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { isValidLocale, defaultLocale } from "@/lib/i18n"
import { CategoryCard } from "@/components/public/CategoryCard"
import { PublicShell } from "@/components/public/PublicShell"
import { HeroSearch } from "@/components/public/HeroSearch"
import { HeroVideo } from "@/components/public/HeroVideo"
import { SynthesiaEmbed } from "@/components/public/SynthesiaEmbed"
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

  const [categories, pinnedArticles, pinnedVideos] = await Promise.all([
    prisma.category.findMany({
      orderBy: { position: "asc" },
      include: {
        translations: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          where: { locale: validLocale as any },
        },
        _count: { select: { articles: true } },
      },
    }),
    prisma.article.findMany({
      where: { pinned: true },
      orderBy: { updatedAt: "desc" },
      include: {
        translations: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          where: { locale: { in: [validLocale, "en"] } as any },
        },
        category: true,
      },
    }),
    prisma.video.findMany({
      where: { pinned: true, status: "READY" },
      orderBy: { updatedAt: "desc" },
      include: {
        translations: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          where: { locale: { in: [validLocale, "en"] } as any },
        },
      },
    }),
  ])

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

  const featuredLabel: Record<string, string> = {
    en: "Featured articles",
    da: "Udvalgte artikler",
    sv: "Utvalda artiklar",
    de: "Empfohlene Artikel",
  }

  const featuredVideoLabel: Record<string, string> = {
    en: "Featured videos",
    da: "Udvalgte videoer",
    sv: "Utvalda videor",
    de: "Empfohlene Videos",
  }

  return (
    <PublicShell locale={validLocale} hideSearch>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ background: "#1a1a2c" }}>
        {/* Video background — cycles randomly through all 4 bg videos */}
        <HeroVideo />

        {/* Dark overlay over video (also serves as fallback when no video) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(26,26,44,0.58) 0%, rgba(42,28,14,0.50) 100%)",
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

        <div className="relative z-10 max-w-2xl mx-auto px-4 text-center py-20 sm:py-28">
          <p className="text-[#EC6E1E] text-sm font-semibold uppercase tracking-widest mb-5">
            Data &amp; More Support
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
            {heroText[validLocale] ?? heroText.en}
          </h1>
          <p className="text-white/50 mb-10 text-base sm:text-lg">
            {subText[validLocale] ?? subText.en}
          </p>
          <HeroSearch locale={validLocale} />
        </div>
      </section>

      {/* ── Pinned / Featured articles ── */}
      {pinnedArticles.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 pt-10 pb-2 w-full">
          <div className="flex items-center gap-2 mb-5">
            <Pin size={13} className="text-[#EC6E1E] shrink-0" strokeWidth={2.5} />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              {featuredLabel[validLocale] ?? featuredLabel.en}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {pinnedArticles.map((article) => {
              const t =
                article.translations.find((tr) => tr.locale === validLocale) ??
                article.translations.find((tr) => tr.locale === "en")
              if (!t) return null
              const href = article.category
                ? `/${validLocale}/knowledge/${article.category.slug}/${article.slug}`
                : `/${validLocale}/knowledge/${article.slug}`
              return (
                <Link
                  key={article.id}
                  href={href}
                  className="group block bg-white rounded-2xl border border-orange-100 p-5 hover:border-[#EC6E1E] hover:shadow-md transition-all duration-200"
                >
                  <h3 className="font-semibold text-[#2A2A2C] group-hover:text-[#EC6E1E] transition-colors text-sm leading-snug mb-1.5">
                    {t.title}
                  </h3>
                  {t.excerpt && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                      {t.excerpt}
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Pinned / Featured videos ── */}
      {pinnedVideos.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 pt-10 pb-2 w-full">
          <div className="flex items-center gap-2 mb-5">
            <Play size={13} className="text-[#EC6E1E] shrink-0" strokeWidth={2.5} />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              {featuredVideoLabel[validLocale] ?? featuredVideoLabel.en}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {pinnedVideos.map((video) => {
              const t =
                video.translations.find((tr) => tr.locale === validLocale) ??
                video.translations.find((tr) => tr.locale === "en")
              const title = t?.title ?? video.originalFilename
              const description = t?.description ?? null
              return (
                <div
                  key={video.id}
                  className="bg-white rounded-2xl border border-orange-100 overflow-hidden hover:border-[#EC6E1E] hover:shadow-md transition-all duration-200"
                >
                  <div className="aspect-video bg-gray-900">
                    {video.synthesiaId ? (
                      <SynthesiaEmbed videoId={video.synthesiaId} locale={validLocale} className="w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
                        Video
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-[#2A2A2C] text-sm leading-snug mb-1">
                      {title}
                    </h3>
                    {description && (
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                        {description}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Category grid ── */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-7">
          {categoryLabel[validLocale] ?? categoryLabel.en}
        </p>

        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
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

    </PublicShell>
  )
}
