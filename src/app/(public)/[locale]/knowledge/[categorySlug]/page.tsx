import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { isValidLocale, defaultLocale } from "@/lib/i18n"
import { PublicShell } from "@/components/public/PublicShell"
import { Breadcrumb } from "@/components/public/Breadcrumb"
import { ArticleCard } from "@/components/public/ArticleCard"
import type { Metadata } from "next"

type Props = { params: Promise<{ locale: string; categorySlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, categorySlug } = await params
  const validLocale = isValidLocale(locale) ? locale : defaultLocale
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    include: { translations: { where: { locale: validLocale as any } } },
  })
  const name = category?.translations[0]?.name ?? categorySlug
  return { title: name }
}

export default async function CategoryPage({ params }: Props) {
  const { locale, categorySlug } = await params
  const validLocale = isValidLocale(locale) ? locale : defaultLocale

  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    include: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      translations: { where: { locale: validLocale as any } },
      articles: {
        where: {
          translations: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            some: { locale: validLocale as any, status: "PUBLISHED" },
          },
        },
        orderBy: { position: "asc" },
        include: {
          translations: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where: { locale: validLocale as any, status: "PUBLISHED" },
          },
          tags: { include: { tag: true } },
        },
      },
    },
  })

  if (!category) {
    // Maybe this "category" slug is actually an old article slug (from HubSpot URLs like /knowledge/slug)
    const article = await prisma.article.findUnique({
      where: { slug: categorySlug },
      include: { category: true },
    })
    if (article?.category) {
      redirect(`/${validLocale}/knowledge/${article.category.slug}/${article.slug}`)
    }
    if (article) {
      // Article exists but has no category
      redirect(`/${validLocale}`)
    }
    notFound()
  }

  const translation = category.translations[0]

  return (
    <PublicShell locale={validLocale}>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <Breadcrumb
          crumbs={[
            { label: "Support", href: `/${validLocale}` },
            { label: translation?.name ?? categorySlug },
          ]}
        />

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#2A2A2C]">
            {translation?.name ?? categorySlug}
          </h1>
          {translation?.description && (
            <p className="text-gray-500 mt-1">{translation.description}</p>
          )}
        </div>

        <div className="space-y-3">
          {category.articles.length === 0 ? (
            <p className="text-gray-500 text-sm">No articles published yet.</p>
          ) : (
            category.articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                categorySlug={categorySlug}
                locale={validLocale}
              />
            ))
          )}
        </div>
      </main>
    </PublicShell>
  )
}
