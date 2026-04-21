"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { BubbleMenu } from "@tiptap/react/menus"
import type { Editor } from "@tiptap/react"
import { ExternalLink, Pencil, Trash2, Search, FileText } from "lucide-react"

interface LinkBubbleMenuProps {
  editor: Editor
}

interface ArticleResult {
  id: string
  slug: string
  title: string
  category: string
}

export function LinkBubbleMenu({ editor }: LinkBubbleMenuProps) {
  const [mode, setMode] = useState<"view" | "edit" | "search">("view")
  const [url, setUrl] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ArticleResult[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeout = useRef<NodeJS.Timeout>(null)

  const currentHref = editor.getAttributes("link").href ?? ""

  // Reset mode when link changes
  useEffect(() => {
    setMode("view")
    setUrl(currentHref)
  }, [currentHref])

  // Focus input when entering edit/search mode
  useEffect(() => {
    if (mode === "edit") setTimeout(() => inputRef.current?.focus(), 50)
    if (mode === "search") setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [mode])

  const removeLink = useCallback(() => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run()
  }, [editor])

  const applyLink = useCallback((href: string) => {
    if (!href.trim()) {
      removeLink()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run()
    setMode("view")
  }, [editor, removeLink])

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/articles?locale=en&search=${encodeURIComponent(q)}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(
            (data.articles ?? []).slice(0, 8).map((a: { id: string; slug: string; translations?: Array<{ title: string }>; category?: { translations?: Array<{ name: string }> } }) => ({
              id: a.id,
              slug: a.slug,
              title: a.translations?.[0]?.title ?? a.slug,
              category: a.category?.translations?.[0]?.name ?? "",
            }))
          )
        }
      } catch {
        // ignore
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [])

  const selectArticle = useCallback((article: ArticleResult) => {
    const href = `/en/knowledge/${article.slug}`
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run()
    setMode("view")
    setSearchQuery("")
    setSearchResults([])
  }, [editor])

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "bottom-start" }}
      shouldShow={({ editor }) => editor.isActive("link")}
      className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
    >
      {mode === "view" && (
        <div className="flex items-center gap-1 p-1.5">
          {/* Show current URL */}
          <a
            href={currentHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#EC6E1E] hover:bg-orange-50 rounded-lg max-w-[250px] truncate transition-colors cursor-pointer"
            title={currentHref}
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">{currentHref}</span>
          </a>

          <div className="w-px h-5 bg-gray-200" />

          {/* Edit URL */}
          <button
            onClick={() => { setUrl(currentHref); setMode("edit") }}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
            title="Edit link"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Link to article */}
          <button
            onClick={() => { setSearchQuery(""); setSearchResults([]); setMode("search") }}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
            title="Link to article"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {/* Remove link */}
          <button
            onClick={removeLink}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
            title="Remove link"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {mode === "edit" && (
        <div className="flex items-center gap-1.5 p-2">
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); applyLink(url) }
              if (e.key === "Escape") setMode("view")
            }}
            placeholder="https://..."
            className="w-64 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EC6E1E]/20 focus:border-[#EC6E1E]"
          />
          <button
            onClick={() => applyLink(url)}
            className="px-3 py-1.5 text-xs font-medium bg-[#EC6E1E] text-white rounded-lg hover:bg-[#d4601a] transition-colors cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={() => setMode("view")}
            className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {mode === "search" && (
        <div className="w-80">
          <div className="flex items-center gap-2 p-2 border-b border-gray-100">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setMode("view")
              }}
              placeholder="Search articles…"
              className="flex-1 text-sm focus:outline-none"
            />
            <button
              onClick={() => setMode("view")}
              className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {searching && (
              <p className="px-3 py-4 text-xs text-gray-400 text-center">Searching…</p>
            )}
            {!searching && searchQuery && searchResults.length === 0 && (
              <p className="px-3 py-4 text-xs text-gray-400 text-center">No articles found</p>
            )}
            {searchResults.map((article) => (
              <button
                key={article.id}
                onClick={() => selectArticle(article)}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-0"
              >
                <p className="text-sm font-medium text-gray-900 line-clamp-1">{article.title}</p>
                {article.category && (
                  <p className="text-[10px] text-gray-400 mt-0.5">{article.category}</p>
                )}
              </button>
            ))}
            {!searching && !searchQuery && (
              <p className="px-3 py-4 text-xs text-gray-400 text-center">Type to search articles</p>
            )}
          </div>
        </div>
      )}
    </BubbleMenu>
  )
}
