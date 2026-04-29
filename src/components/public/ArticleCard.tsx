import Link from "next/link"

interface ArticleCardProps {
  article: {
    slug: string
    isGated: boolean
    translations: { title: string; excerpt: string | null }[]
    tags?: { tag: { name: string; slug: string } }[]
  }
  categorySlug: string
  locale: string
}

/** Decode common HTML entities that leak through from imported content */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export function ArticleCard({ article, categorySlug, locale }: ArticleCardProps) {
  const translation = article.translations[0]
  if (!translation) return null

  const tags = article.tags ?? []

  return (
    <Link
      href={`/${locale}/knowledge/${categorySlug}/${article.slug}`}
      className="group block bg-white rounded-xl border border-gray-200 p-5 hover:border-orange-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 group-hover:text-[#EC6E1E] transition-colors">
            {decodeEntities(translation.title)}
          </h3>
          {translation.excerpt && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {decodeEntities(translation.excerpt)}
            </p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map(({ tag }) => (
                <span
                  key={tag.slug}
                  className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full"
                >
                  {tag.name}
                </span>
              ))}
            </div>
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
