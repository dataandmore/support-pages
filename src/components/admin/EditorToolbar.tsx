"use client"

import type { Editor } from "@tiptap/react"
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, Play,
  Highlighter, Code, Minus, Undo, Redo,
  ExternalLink, FileText, Search,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

interface EditorToolbarProps {
  editor: Editor | null
  onImageUpload?: () => void
  onVideoInsert?: () => void
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-orange-100 text-[#EC6E1E]"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 mx-1" />
}

interface ArticleResult {
  id: string
  slug: string
  title: string
  category: string
}

function LinkPopover({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [tab, setTab] = useState<"external" | "article">("external")
  const [url, setUrl] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ArticleResult[]>([])
  const [searching, setSearching] = useState(false)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeout = useRef<NodeJS.Timeout>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Pre-fill with existing link URL if editing
  useEffect(() => {
    const prev = editor.getAttributes("link").href ?? ""
    if (prev) {
      // If it's an internal link, switch to article tab
      if (prev.startsWith("/") && prev.includes("/knowledge/")) {
        setTab("article")
      } else {
        setUrl(prev)
      }
    }
  }, [editor])

  // Focus the right input when tab changes
  useEffect(() => {
    setTimeout(() => {
      if (tab === "external") urlInputRef.current?.focus()
      if (tab === "article") searchInputRef.current?.focus()
    }, 50)
  }, [tab])

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  const applyExternalLink = useCallback(() => {
    if (!url.trim()) return
    let href = url.trim()
    // Auto-add https:// if missing protocol
    if (!/^https?:\/\//i.test(href) && !href.startsWith("/")) {
      href = "https://" + href
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run()
    onClose()
  }, [editor, url, onClose])

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
    onClose()
  }, [editor, onClose])

  return (
    <div ref={popoverRef} className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-80">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab("external")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
            tab === "external"
              ? "text-[#EC6E1E] border-b-2 border-[#EC6E1E] bg-orange-50/50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          External URL
        </button>
        <button
          onClick={() => setTab("article")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
            tab === "article"
              ? "text-[#EC6E1E] border-b-2 border-[#EC6E1E] bg-orange-50/50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Internal Article
        </button>
      </div>

      {/* External URL tab */}
      {tab === "external" && (
        <div className="p-3">
          <input
            ref={urlInputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); applyExternalLink() }
              if (e.key === "Escape") onClose()
            }}
            placeholder="https://example.com"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EC6E1E]/20 focus:border-[#EC6E1E]"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-gray-400">Opens in a new tab</p>
            <div className="flex gap-1.5">
              <button
                onClick={onClose}
                className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={applyExternalLink}
                disabled={!url.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-[#EC6E1E] text-white rounded-lg hover:bg-[#d4601a] transition-colors cursor-pointer disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Article search tab */}
      {tab === "article" && (
        <div>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") onClose()
              }}
              placeholder="Search articles..."
              className="flex-1 text-sm focus:outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {searching && (
              <p className="px-3 py-4 text-xs text-gray-400 text-center">Searching...</p>
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
    </div>
  )
}

export function EditorToolbar({ editor, onImageUpload, onVideoInsert }: EditorToolbarProps) {
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false)

  const toggleLinkPopover = useCallback(() => {
    if (!editor) return
    setLinkPopoverOpen((prev) => !prev)
  }, [editor])

  const insertTable = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-200 bg-gray-50">
      {/* Undo / redo */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo" disabled={!editor.can().undo()}>
        <Undo className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo" disabled={!editor.can().redo()}>
        <Redo className="w-4 h-4" />
      </ToolbarButton>
      <Divider />

      {/* Headings */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
        <Heading1 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
        <Heading3 className="w-4 h-4" />
      </ToolbarButton>
      <Divider />

      {/* Formatting */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
        <Underline className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
        <Strikethrough className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">
        <Highlighter className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline code">
        <Code className="w-4 h-4" />
      </ToolbarButton>
      <Divider />

      {/* Lists */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list">
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>
      <Divider />

      {/* Alignment */}
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">
        <AlignLeft className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center">
        <AlignCenter className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">
        <AlignRight className="w-4 h-4" />
      </ToolbarButton>
      <Divider />

      {/* Links & media */}
      <div className="relative">
        <ToolbarButton onClick={toggleLinkPopover} active={editor.isActive("link") || linkPopoverOpen} title="Insert/edit link">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        {linkPopoverOpen && (
          <LinkPopover editor={editor} onClose={() => setLinkPopoverOpen(false)} />
        )}
      </div>
      {onImageUpload && (
        <ToolbarButton onClick={onImageUpload} title="Insert image">
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
      )}
      {onVideoInsert && (
        <ToolbarButton onClick={onVideoInsert} title="Insert video">
          <Play className="w-4 h-4" />
        </ToolbarButton>
      )}
      <ToolbarButton onClick={insertTable} title="Insert table">
        <TableIcon className="w-4 h-4" />
      </ToolbarButton>
      <Divider />

      {/* Misc */}
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
        <Minus className="w-4 h-4" />
      </ToolbarButton>
    </div>
  )
}
