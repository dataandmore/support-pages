import { notFound, redirect } from "next/navigation"
import { existsSync } from "fs"
import { join } from "path"
import { prisma } from "@/lib/prisma"
import { isValidLocale, defaultLocale, localeNames } from "@/lib/i18n"
import { auth } from "@/lib/auth"
import { PublicShell } from "@/components/public/PublicShell"
import { Breadcrumb } from "@/components/public/Breadcrumb"
import { ArticleContent } from "@/components/public/ArticleContent"
import { TableOfContents } from "@/components/public/TableOfContents"
import { RelatedArticles } from "@/components/public/RelatedArticles"
import { TranslationNotice } from "@/components/public/TranslationNotice"
import { ArticleAdminBar } from "@/components/public/ArticleAdminBar"
import type { Metadata } from "next"

type Props = {
  params: Promise<{ locale: string; categorySlug: string; articleSlug: string }>
}

function extractText(node: unknown): string {
  if (!node || typeof node !== "object") return ""
  const n = node as { type?: string; text?: string; content?: unknown[] }
  if (n.type === "text") return n.text ?? ""
  if (!n.content) return ""
  return n.content.map(extractText).join(" ")
}

function readingTime(content: unknown): number {
  const words = extractText(content).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, articleSlug } = await params
  const validLocale = isValidLocale(locale) ? locale : defaultLocale
  const article = await prisma.article.findUnique({
    where: { slug: articleSlug },
    include: {
      translations: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { locale: { in: [validLocale, "en"] } as any },
      },
    },
  })
  const t =
    article?.translations.find((t) => t.locale === validLocale) ??
    article?.translations.find((t) => t.locale === "en")
  return {
    title: t?.title ?? articleSlug,
    description: t?.excerpt ?? undefined,
  }
}

export default async function ArticlePage({ params }: Props) {
  const { locale, categorySlug, articleSlug } = await params
  const validLocale = isValidLocale(locale) ? locale : defaultLocale

  const article = await prisma.article.findUnique({
    where: { slug: articleSlug },
    include: {
      translations: {
        // Fetch both the requested locale AND English for fallback
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { locale: { in: [validLocale, "en"] } as any },
      },
      category: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        include: { translations: { where: { locale: validLocale as any } } },
      },
      relatedTo: {
        include: {
          relatedArticle: {
            include: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              translations: { where: { locale: validLocale as any } },
              category: true,
            },
          },
        },
      },
    },
  })

  if (!article) notFound()

  // Always resolve the session — used for both gating and the admin bar
  const session = await auth()
  const isAuthenticated = !!session

  // Gated content: redirect to login if not authenticated.
  if (article.isGated && !isAuthenticated) {
    redirect(
      `/${validLocale}/login?callbackUrl=/${validLocale}/knowledge/${categorySlug}/${articleSlug}`
    )
  }

  // Check if a local HubSpot archive exists for this article
  const hasArchive = existsSync(
    join(process.cwd(), "public", "hubspot-archive", `${articleSlug}.html`)
  )

  // Pick the best available translation — prefer current locale, fall back to English
  const localeTranslation = article.translations.find((t) => t.locale === validLocale)
  const enTranslation = article.translations.find((t) => t.locale === "en")
  const translation = localeTranslation ?? enTranslation
  if (!translation) notFound()

  // Did we fall back to English because the requested locale has no translation?
  const isFallback = !localeTranslation && validLocale !== "en"

  const categoryName = article.category?.translations[0]?.name ?? categorySlug
  const relatedArticles = article.relatedTo.map((r) => r.relatedArticle)
  const minRead = readingTime(translation.content)

  const readLabel: Record<string, string> = {
    en: `${minRead} min read`,
    da: `${minRead} min læsning`,
    sv: `${minRead} min läsning`,
    de: `${minRead} Min. Lesezeit`,
  }

  return (
    <PublicShell locale={validLocale}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <Breadcrumb
          crumbs={[
            { label: "Support", href: `/${validLocale}` },
            { label: categoryName, href: `/${validLocale}/knowledge/${categorySlug}` },
            { label: translation.title },
          ]}
        />

        <div className="flex gap-10 items-start">
          {/* Main content */}
          <article className="relative flex-1 min-w-0 bg-white rounded-2xl border border-gray-200 px-6 sm:px-10 py-8">
            {/* Admin bar — always visible, gated by login for edit action */}
            <ArticleAdminBar
              articleId={article.id}
              articleSlug={articleSlug}
              isAuthenticated={isAuthenticated}
              hasArchive={hasArchive}
              isPinned={article.pinned}
            />

            {/* Translation fallback notice */}
            {isFallback && (
              <TranslationNotice
                articleId={article.id}
                requestedLocale={validLocale}
                requestedLocaleName={localeNames[validLocale as keyof typeof localeNames] ?? validLocale}
                fallbackLocaleName={localeNames["en"]}
              />
            )}

            {/* Article header — pr-36 leaves room for the top-right admin buttons */}
            <header className="mb-8 pb-6 border-b border-gray-100 pr-36">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-3">
                {translation.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                <span>{readLabel[validLocale] ?? readLabel.en}</span>
                {article.isGated && (
                  <span className="text-[#EC6E1E] font-medium">Members only</span>
                )}
                {translation.publishedAt && (
                  <span>
                    {new Date(translation.publishedAt).toLocaleDateString(validLocale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
              {translation.excerpt && (
                <p
                  className="mt-4 text-base text-gray-500 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: translation.excerpt
                      .replace(/&amp;/g, "&")
                      .replace(/&lt;/g, "<")
                      .replace(/&gt;/g, ">")
                      .replace(/&quot;/g, '"')
                      .replace(/&#39;/g, "'"),
                  }}
                />
              )}
            </header>

            <ArticleContent content={translation.content} />
            <RelatedArticles articles={relatedArticles} locale={validLocale} />
          </article>

          {/* TOC sidebar — xl+ only */}
          <aside className="hidden xl:block w-52 shrink-0 sticky top-24">
            <TableOfContents />
          </aside>
        </div>
      </main>
    </PublicShell>
  )
}
