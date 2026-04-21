"use client"

import React, { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { Search, Sparkles, X, Edit, GripVertical, ChevronDown, ChevronRight } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { DeleteArticleButton } from "./DeleteArticleButton"

export interface CategoryOption {
  id: string
  name: string
}

export interface ArticleRow {
  id: string
  slug: string
  title: string
  categoryId: string | null
  category: string
  tags: string[]
  statuses: { en?: string; da?: string; sv?: string; de?: string }
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  PUBLISHED: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  IN_REVIEW: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  AI_DRAFT:  { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  DRAFT:     { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-400" },
  ARCHIVED:  { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400" },
}

const LOCALES = ["en", "da", "sv", "de"] as const

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>
  const config = STATUS_CONFIG[status]
  if (!config) return <span className="text-xs text-gray-400">{status}</span>
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {status.replace("_", " ")}
    </span>
  )
}

function SortableArticleRow({
  article,
  categories,
  categoryOverrides,
  savingCategory,
  onCategoryChange,
}: {
  article: ArticleRow
  categories: CategoryOption[]
  categoryOverrides: Record<string, { id: string | null; name: string }>
  savingCategory: string | null
  onCategoryChange: (articleId: string, categoryId: string | null) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: article.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group border-b border-gray-100 transition-colors ${isDragging ? "bg-orange-50/50" : "hover:bg-gray-50/80"}`}
    >
      <td className="w-8 px-1 py-3">
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="px-3 py-3 max-w-md">
        <Link
          href={`/admin/articles/${article.id}`}
          className="font-medium text-gray-900 hover:text-[#EC6E1E] transition-colors line-clamp-1"
        >
          {article.title}
        </Link>
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {article.tags.map((tag) => (
              <span key={tag} className="inline-flex px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-500">
                {tag}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-3 py-3">
        <select
          value={categoryOverrides[article.id]?.id ?? article.categoryId ?? ""}
          onChange={(e) => onCategoryChange(article.id, e.target.value || null)}
          disabled={savingCategory === article.id}
          className="text-xs text-gray-500 bg-transparent border border-transparent rounded-md px-1.5 py-1 hover:border-gray-200 focus:border-[#EC6E1E] focus:ring-1 focus:ring-[#EC6E1E]/20 cursor-pointer transition-all disabled:opacity-50 max-w-[140px]"
        >
          <option value="">— None —</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </td>
      {LOCALES.map((loc) => (
        <td key={loc} className="px-3 py-3">
          <StatusBadge status={article.statuses[loc]} />
        </td>
      ))}
      <td className="px-3 py-3">
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/admin/articles/${article.id}`}
            className="p-1.5 rounded-md hover:bg-gray-200 inline-flex text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
          </Link>
          <DeleteArticleButton articleId={article.id} />
        </div>
      </td>
    </tr>
  )
}

export function ArticlesSearchList({ articles, categories }: { articles: ArticleRow[]; categories: CategoryOption[] }) {
  const [query, setQuery] = useState("")
  const [aiIds, setAiIds] = useState<string[] | null>(null)
  const [aiSearching, setAiSearching] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [hideArchived, setHideArchived] = useState(true)
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, { id: string | null; name: string }>>({})
  const [savingCategory, setSavingCategory] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [orderOverrides, setOrderOverrides] = useState<Record<string, string[]>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleCategoryChange = useCallback(async (articleId: string, categoryId: string | null) => {
    const cat = categories.find((c) => c.id === categoryId)
    setCategoryOverrides((prev) => ({
      ...prev,
      [articleId]: { id: categoryId, name: cat?.name ?? "—" },
    }))
    setSavingCategory(articleId)
    try {
      const res = await fetch(`/api/articles/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      })
      if (!res.ok) throw new Error("Failed to update category")
    } catch {
      setCategoryOverrides((prev) => {
        const next = { ...prev }
        delete next[articleId]
        return next
      })
    } finally {
      setSavingCategory(null)
    }
  }, [categories])

  const textFiltered = useMemo(() => {
    let list = articles
    if (hideArchived) {
      list = list.filter((a) => a.statuses.en !== "ARCHIVED")
    }
    if (!query.trim()) return list
    const q = query.toLowerCase()
    return list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [articles, query, hideArchived])

  const filtered = aiIds !== null
    ? articles.filter((a) => aiIds.includes(a.id))
    : textFiltered

  const grouped = useMemo(() => {
    const groups: Record<string, ArticleRow[]> = {}
    for (const a of filtered) {
      const catName = categoryOverrides[a.id]?.name ?? a.category
      if (!groups[catName]) groups[catName] = []
      groups[catName].push(a)
    }
    // Apply order overrides or sort alphabetically
    for (const key of Object.keys(groups)) {
      const override = orderOverrides[key]
      if (override) {
        groups[key].sort((a, b) => {
          const ai = override.indexOf(a.id)
          const bi = override.indexOf(b.id)
          if (ai === -1 && bi === -1) return a.title.localeCompare(b.title)
          if (ai === -1) return 1
          if (bi === -1) return -1
          return ai - bi
        })
      } else {
        groups[key].sort((a, b) => a.title.localeCompare(b.title))
      }
    }
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "—") return 1
      if (b === "—") return -1
      return a.localeCompare(b)
    })
    return sortedKeys.map((name) => ({ name, articles: groups[name] }))
  }, [filtered, categoryOverrides, orderOverrides])

  const displayed = filtered

  const archivedCount = useMemo(
    () => articles.filter((a) => a.statuses.en === "ARCHIVED").length,
    [articles]
  )

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
      const text = await res.text()
      let data: { ids?: string[]; error?: string }
      try { data = JSON.parse(text) } catch { throw new Error("Server returned an invalid response") }
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

  function toggleGroup(name: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function handleDragEnd(groupName: string, event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const group = grouped.find((g) => g.name === groupName)
    if (!group) return

    const oldIndex = group.articles.findIndex((a) => a.id === active.id)
    const newIndex = group.articles.findIndex((a) => a.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(group.articles, oldIndex, newIndex)
    const newOrder = reordered.map((a) => a.id)

    setOrderOverrides((prev) => ({ ...prev, [groupName]: newOrder }))

    // Persist position changes
    reordered.forEach((article, index) => {
      fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: index }),
      })
    })
  }

  return (
    <>
      {/* Search toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
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
            className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC6E1E]/20 focus:border-[#EC6E1E] transition-shadow shadow-sm"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={handleAiSearch}
          disabled={!query.trim() || aiSearching}
          title="Semantic search powered by Claude AI"
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl border border-[#EC6E1E]/20 bg-[#EC6E1E]/5 text-[#EC6E1E] hover:bg-[#EC6E1E]/10 disabled:opacity-40 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {aiSearching ? "Searching…" : "AI search"}
        </button>

        <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
          {aiIds !== null
            ? `${displayed.length} semantic match${displayed.length !== 1 ? "es" : ""}`
            : query
              ? `${displayed.length} of ${articles.length}`
              : `${articles.length} articles`}
        </span>

        {archivedCount > 0 && (
          <button
            onClick={() => setHideArchived(!hideArchived)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              hideArchived
                ? "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            {hideArchived ? `Show archived (${archivedCount})` : "Hide archived"}
          </button>
        )}

        {aiError && (
          <span className="text-xs text-red-500">{aiError}</span>
        )}
      </div>

      {/* Grouped article cards */}
      <div className="space-y-4">
        {grouped.map((group) => {
          const isCollapsed = collapsedGroups.has(group.name)
          return (
            <div key={group.name} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => toggleGroup(group.name)}
                className="w-full flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-colors cursor-pointer"
              >
                {isCollapsed
                  ? <ChevronRight className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />
                }
                <h3 className="text-sm font-semibold text-[#2A2A2C]">{group.name}</h3>
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#EC6E1E]/10 text-[#EC6E1E] text-xs font-semibold">
                  {group.articles.length}
                </span>
              </button>

              {/* Articles table */}
              {!isCollapsed && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(group.name, e)}
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-t border-b border-gray-100">
                        <th className="w-8"></th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Title</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
                        {LOCALES.map((loc) => (
                          <th key={loc} className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">{loc.toUpperCase()}</th>
                        ))}
                        <th className="w-20"></th>
                      </tr>
                    </thead>
                    <SortableContext
                      items={group.articles.map((a) => a.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <tbody>
                        {group.articles.map((article) => (
                          <SortableArticleRow
                            key={article.id}
                            article={article}
                            categories={categories}
                            categoryOverrides={categoryOverrides}
                            savingCategory={savingCategory}
                            onCategoryChange={handleCategoryChange}
                          />
                        ))}
                      </tbody>
                    </SortableContext>
                  </table>
                </DndContext>
              )}
            </div>
          )
        })}

        {displayed.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <p className="text-gray-400 text-sm">
              {query ? `No articles match "${query}"` : "No articles yet"}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
