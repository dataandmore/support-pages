import Link from "next/link"
import { ChevronRight } from "lucide-react"
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
      className="group block bg-white rounded-2xl border border-gray-200 p-6 hover:border-[#EC6E1E]/40 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#f5f6f8] group-hover:bg-[#EC6E1E]/10 flex items-center justify-center text-2xl shrink-0 transition-colors">
          {category.icon ?? "📄"}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-[#2A2A2C] group-hover:text-[#EC6E1E] transition-colors leading-snug">
              {translation.name}
            </h2>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#EC6E1E] shrink-0 transition-colors" />
          </div>

          {translation.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">
              {translation.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-gray-400">
              {category._count.articles} article{category._count.articles !== 1 ? "s" : ""}
            </span>
            {category.isGated && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                Members only
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
