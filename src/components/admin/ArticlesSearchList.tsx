"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, Sparkles, X, Edit } from "lucide-react"
import { DeleteArticleButton } from "./DeleteArticleButton"

export interface ArticleRow {
  id: string
  slug: string
  title: string
  category: string
  statuses: { en?: string; da?: string; sv?: string; de?: string }
}

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  IN_REVIEW:  "bg-orange-100 text-[#EC6E1E]",
  AI_DRAFT:   "bg-purple-100 text-purple-700",
  DRAFT:      "bg-gray-100 text-gray-600",
}

const LOCALES = ["en", "da", "sv", "de"] as const

export function ArticlesSearchList({ articles }: { articles: ArticleRow[] }) {
  const [query, setQuery]         = useState("")
  const [aiIds, setAiIds]         = useState<string[] | null>(null)
  const [aiSearching, setAiSearching] = useState(false)
  const [aiError, setAiError]     = useState<string | null>(null)

  // Instant client-side text filter (while user types)
  const textFiltered = useMemo(() => {
    if (!query.trim()) return articles
    const q = query.toLowerCase()
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    )
  }, [articles, query])

  // When AI search has run, show only those IDs; otherwise show text-filtered
  const displayed = aiIds !== null
    ? articles.filter((a) => aiIds.includes(a.id))
    : textFiltered

  async function handleAiSearch() {
    if (!query.trim()) return
    setAiSearching(true)
    setAiError(null)
    setAiIds(null)
    try {
      const res = await fetch("/api/admin/articles/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          articles: articles.map((a) => ({
            id: a.id,
            title: a.title,
            category: a.category,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Search failed")
      setAiIds(data.ids as string[])
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "AI search failed")
    } finally {
      setAiSearching(false)
    }
  }

  function clearSearch() {
    setQuery("")
    setAiIds(null)
    setAiError(null)
  }

  return (
    <>
      {/* Search bar */}
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setAiIds(null)
              setAiError(null)
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
            placeholder="Search articles…"
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EC6E1E]/30 focus:border-[#EC6E1E]"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* AI search button */}
        <button
          onClick={handleAiSearch}
          disabled={!query.trim() || aiSearching}
          title="Semantic search powered by Claude AI — finds articles by meaning, not just keywords"
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-40 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {aiSearching ? "Searching…" : "AI search"}
        </button>

        {/* Result count */}
        <span className="text-xs text-gray-400 tabular-nums ml-1">
          {aiIds !== null
            ? `${displayed.length} semantic match${displayed.length !== 1 ? "es" : ""}`
            : query
              ? `${displayed.length} of ${articles.length}`
              : `${articles.length} articles`}
        </span>

        {aiError && (
          <span className="text-xs text-red-500">{aiError}</span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Title (EN)</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">EN</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">DA</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">SV</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">DE</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((article) => (
              <tr key={article.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link
                    href={`/admin/articles/${article.id}`}
                    className="hover:text-[#EC6E1E] transition-colors"
                  >
                    {article.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{article.category}</td>
                {LOCALES.map((loc) => {
                  const status = article.statuses[loc]
                  return (
                    <td key={loc} className="px-4 py-3">
                      {status ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? ""}`}
                        >
                          {status.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  )
                })}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-0.5">
                    <Link
                      href={`/admin/articles/${article.id}`}
                      className="p-1.5 rounded hover:bg-gray-200 inline-flex text-gray-500 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <DeleteArticleButton articleId={article.id} />
                  </div>
                </td>
              </tr>
            ))}

            {displayed.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  {query
                    ? `No articles match "${query}"`
                    : "No articles yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
