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
      className="group block bg-white rounded-2xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        <div className="text-3xl leading-none mt-0.5">{category.icon ?? "📄"}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
              {translation.name}
            </h2>
            {category.isGated && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                Login required
              </span>
            )}
          </div>
          {translation.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {translation.description}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            {category._count.articles} article{category._count.articles !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </Link>
  )
}
