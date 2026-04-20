import Link from "next/link"
import { isValidLocale, defaultLocale } from "@/lib/i18n"

interface CategoryCardProps {
  category: {
    id: string
    slug: string
    icon: string | null
    isGated: boolean
    translations: { name: string; description: string | null }[]
    _count: { articles: number }
  }
  locale: string
}

export function CategoryCard({ category, locale }: CategoryCardProps) {
  const validLocale = isValidLocale(locale) ? locale : defaultLocale
  const translation = category.translations[0]
  if (!translation) return null

  return (
    <Link
      href={`/${validLocale}/knowledge/${category.slug}`}
      className="group block bg-white rounded-2xl border border-gray-200 p-6 hover:border-[#EC6E1E] hover:shadow-lg transition-all duration-200"
    >
      <h2 className="font-semibold text-[#2A2A2C] group-hover:text-[#EC6E1E] transition-colors text-base leading-snug mb-2">
        {translation.name}
      </h2>

      {translation.description && (
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-4">
          {translation.description}
        </p>
      )}

      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {category._count.articles} {category._count.articles === 1 ? "article" : "articles"}
        </span>
        {category.isGated && (
          <span className="text-xs bg-orange-100 text-[#EC6E1E] px-2 py-0.5 rounded-full font-medium">
            Members only
          </span>
        )}
      </div>
    </Link>
  )
}
