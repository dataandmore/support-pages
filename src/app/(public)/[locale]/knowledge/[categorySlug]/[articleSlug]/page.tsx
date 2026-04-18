import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { isValidLocale, defaultLocale } from "@/lib/i18n"
import { auth } from "@/lib/auth"
import { Header } from "@/components/public/Header"
import { Footer } from "@/components/public/Footer"
import { Breadcrumb } from "@/components/public/Breadcrumb"
import { ArticleContent } from "@/components/public/ArticleContent"
import { TableOfContents } from "@/components/public/TableOfContents"
import { RelatedArticles } from "@/components/public/RelatedArticles"
import { Clock, Lock } from "lucide-react"
import type { Metadata } from "next"

type Props = {
  params: Promise<{ locale: string; categorySlug: string; articleSlug: string }>
}

/** Walk a Tiptap JSON doc to extract all text for word count. */
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    include: { translations: { where: { locale: validLocale as any } } },
  })
  const translation = article?.translations[0]
  return {
    title: translation?.title ?? articleSlug,
    description: translation?.excerpt ?? undefined,
  }
}

export default async function ArticlePage({ params }: Props) {
  const { locale, categorySlug, articleSlug } = await params
  const validLocale = isValidLocale(locale) ? locale : defaultLocale

  const article = await prisma.article.findUnique({
    where: { slug: articleSlug },
    include: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      translations: { where: { locale: validLocale as any } },
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

  // Gated content: redirect to login if not authenticated.
  if (article.isGated) {
    const session = await auth()
    if (!session) {
      redirect(
        `/${validLocale}/login?callbackUrl=/${validLocale}/knowledge/${categorySlug}/${articleSlug}`
      )
    }
  }

  const translation = article.translations[0]
  if (!translation) notFound()

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header locale={validLocale} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <Breadcrumb
          crumbs={[
            { label: "Support", href: `/${validLocale}` },
            { label: categoryName, href: `/${validLocale}/knowledge/${categorySlug}` },
            { label: translation.title },
          ]}
        />

        <div className="flex gap-12 items-start">
          {/* Main content */}
          <article className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200 px-6 sm:px-10 py-8">
            {/* Article header */}
            <header className="mb-8 pb-6 border-b border-gray-100">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-3">
                {translation.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {readLabel[validLocale] ?? readLabel.en}
                </span>
                {article.isGated && (
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <Lock className="w-3.5 h-3.5" />
                    Premium
                  </span>
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
                <p className="mt-4 text-base text-gray-500 leading-relaxed">
                  {translation.excerpt}
                </p>
              )}
            </header>

            <ArticleContent content={translation.content} />
            <RelatedArticles articles={relatedArticles} locale={validLocale} />
          </article>

          {/* TOC sidebar — xl+ only */}
          <aside className="hidden xl:block w-56 shrink-0 sticky top-24">
            <TableOfContents />
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  )
}
