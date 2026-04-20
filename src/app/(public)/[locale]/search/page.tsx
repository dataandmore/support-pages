import { PublicShell } from "@/components/public/PublicShell"
import { SearchBar } from "@/components/public/SearchBar"
import { searchArticles } from "@/lib/search"
import { isValidLocale, defaultLocale } from "@/lib/i18n"
import Link from "next/link"
import type { Metadata } from "next"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}

export const metadata: Metadata = { title: "Search" }

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { q } = await searchParams
  const validLocale = isValidLocale(locale) ? locale : defaultLocale
  const query = q ?? ""

  const results = query ? await searchArticles(query, validLocale) : []

  return (
    <PublicShell locale={validLocale}>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <div className="mb-8">
          <SearchBar locale={validLocale} />
        </div>

        {query && (
          <p className="text-sm text-gray-500 mb-6">
            {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </p>
        )}

        <div className="space-y-4">
          {results.map((result) => (
            <Link
              key={result.id}
              href={`/${validLocale}/knowledge/${result.categorySlug}/${result.slug}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-[#EC6E1E] hover:shadow-sm transition-all"
            >
              {result.categoryName && (
                <p className="text-xs text-[#EC6E1E] font-medium mb-1 uppercase tracking-wide">
                  {result.categoryName}
                </p>
              )}
              <h3 className="font-semibold text-gray-900 hover:text-[#EC6E1E]">
                {result.title}
              </h3>
              {result.excerpt && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{result.excerpt}</p>
              )}
            </Link>
          ))}

          {query && results.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No results found for &ldquo;{query}&rdquo;</p>
              <Link
                href={`/${validLocale}`}
                className="text-[#EC6E1E] hover:underline text-sm mt-2 block"
              >
                ← Back to all categories
              </Link>
            </div>
          )}
        </div>
      </main>
    </PublicShell>
  )
}
