import Link from "next/link"

interface ArticleCardProps {
  article: {
    slug: string
    isGated: boolean
    translations: { title: string; excerpt: string | null }[]
  }
  categorySlug: string
  locale: string
}

export function ArticleCard({ article, categorySlug, locale }: ArticleCardProps) {
  const translation = article.translations[0]
  if (!translation) return null

  return (
    <Link
      href={`/${locale}/knowledge/${categorySlug}/${article.slug}`}
      className="group block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
            {translation.title}
          </h3>
          {translation.excerpt && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{translation.excerpt}</p>
          )}
        </div>
        {article.isGated && (
          <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            Login required
          </span>
        )}
      </div>
    </Link>
  )
}
