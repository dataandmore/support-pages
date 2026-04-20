import Link from "next/link"

interface RelatedArticlesProps {
  articles: {
    slug: string
    translations: { title: string }[]
    category: { slug: string } | null
  }[]
  locale: string
}

export function RelatedArticles({ articles, locale }: RelatedArticlesProps) {
  if (articles.length === 0) return null

  return (
    <div className="mt-12 pt-8 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Related articles
      </h3>
      <div className="space-y-2">
        {articles.map((article) => {
          const title = article.translations[0]?.title ?? "Untitled"
          const categorySlug = article.category?.slug ?? ""
          return (
            <Link
              key={article.slug}
              href={`/${locale}/knowledge/${categorySlug}/${article.slug}`}
              className="block text-[#EC6E1E] hover:underline text-sm"
            >
              → {title}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
