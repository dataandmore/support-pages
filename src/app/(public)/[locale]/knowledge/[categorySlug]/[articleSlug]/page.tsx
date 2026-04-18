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
import type { Metadata } from "next"

type Props = {
  params: Promise<{ locale: string; categorySlug: string; articleSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, articleSlug } = await params
  const validLocale = isValidLocale(locale) ? locale : defaultLocale
  const article = await prisma.article.findUnique({
    where: { slug: articleSlug },
    include: { translations: { where: { locale: validLocale as any } } },
  })
  const title = article?.translations[0]?.title ?? articleSlug
  return { title }
}

export default async function ArticlePage({ params }: Props) {
  const { locale, categorySlug, articleSlug } = await params
  const validLocale = isValidLocale(locale) ? locale : defaultLocale

  const article = await prisma.article.findUnique({
    where: { slug: articleSlug },
    include: {
      translations: { where: { locale: validLocale as any } },
      category: {
        include: { translations: { where: { locale: validLocale as any } } },
      },
      relatedTo: {
        include: {
          relatedArticle: {
            include: {
              translations: { where: { locale: validLocale as any } },
              category: true,
            },
          },
        },
      },
    },
  })

  if (!article) notFound()

  // Gated content check
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

        <div className="flex gap-12">
          {/* Main content */}
          <article className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              {translation.title}
            </h1>
            <ArticleContent content={translation.content} />
            <RelatedArticles articles={relatedArticles} locale={validLocale} />
          </article>

          {/* TOC sidebar — desktop only */}
          <aside className="hidden xl:block w-56 shrink-0">
            <TableOfContents />
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  )
}
