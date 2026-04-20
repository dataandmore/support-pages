"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { RichEditor } from "@/components/admin/RichEditor"
import { Save, Lock, Wand2, ExternalLink, Eye, X, ArrowLeft } from "lucide-react"

type Locale = "en" | "da" | "sv" | "de"
const LOCALES: Locale[] = ["en", "da", "sv", "de"]
const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  da: "Dansk",
  sv: "Svenska",
  de: "Deutsch",
}

type TranslationState = {
  title: string
  content: unknown
  excerpt: string
  status: string
}

const defaultTranslation = (): TranslationState => ({
  title: "",
  content: {},
  excerpt: "",
  status: "DRAFT",
})

interface CategoryOption {
  id: string
  slug: string
  name: string
  parentId: string | null
  children: { id: string; slug: string; name: string }[]
}

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [activeLocale, setActiveLocale] = useState<Locale>("en")
  const [translations, setTranslations] = useState<Record<Locale, TranslationState>>({
    en: defaultTranslation(),
    da: defaultTranslation(),
    sv: defaultTranslation(),
    de: defaultTranslation(),
  })
  const [isGated, setIsGated] = useState(false)
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState<Locale | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [articleSlug, setArticleSlug] = useState<string>("")
  const [categorySlug, setCategorySlug] = useState<string>("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [categories, setCategories] = useState<CategoryOption[]>([])
  // Track whether article data has been fetched — Tiptap only reads `content`
  // once at mount, so we must not render the editor until real data is available.
  const [contentLoaded, setContentLoaded] = useState(id === "new")

  useEffect(() => {
    // Fetch all categories for the selector
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        const cats: CategoryOption[] = (data.categories ?? []).map((c: {
          id: string; slug: string; parentId: string | null;
          translations: { name: string }[];
          children?: { id: string; slug: string; translations: { name: string }[] }[]
        }) => ({
          id: c.id,
          slug: c.slug,
          name: c.translations[0]?.name ?? c.slug,
          parentId: c.parentId,
          children: (c.children ?? []).map((ch) => ({
            id: ch.id,
            slug: ch.slug,
            name: ch.translations[0]?.name ?? ch.slug,
          })),
        }))
        setCategories(cats)
      })
  }, [])

  useEffect(() => {
    if (id === "new") return
    fetch(`/api/articles/${id}`)
      .then((r) => r.json())
      .then(({ article }) => {
        if (!article) return
        setIsGated(article.isGated)
        setArticleSlug(article.slug ?? "")
        setCategorySlug(article.category?.slug ?? "")
        setCategoryId(article.categoryId ?? "")
        setTranslations((prev) => {
          const next = { ...prev }
          for (const t of article.translations) {
            const loc = t.locale as Locale
            next[loc] = {
              title: t.title,
              content: t.content,
              excerpt: t.excerpt ?? "",
              status: t.status,
            }
          }
          return next
        })
        // Mark content as loaded AFTER state update so the editor
        // mounts with the real content on first render.
        setContentLoaded(true)
      })
  }, [id])

  async function save() {
    setSaving(true)
    const t = translations[activeLocale]
    await fetch(`/api/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isGated,
        categoryId: categoryId || null,
        translation: {
          locale: activeLocale,
          title: t.title,
          content: t.content,
          excerpt: t.excerpt,
          status: t.status,
        },
      }),
    })
    // Update categorySlug for "View on site" link
    const selected = categories.find((c) => c.id === categoryId)
    if (selected) setCategorySlug(selected.slug)
    setSaving(false)
  }

  async function generateTranslation(targetLocale: Locale) {
    setTranslating(targetLocale)
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        articleId: id,
        sourceLocale: "en",
        targetLocale,
        title: translations.en.title,
        content: translations.en.content,
      }),
    })
    const data = await res.json()
    if (data.translation) {
      setTranslations((prev) => ({
        ...prev,
        [targetLocale]: {
          title: data.translation.title,
          content: data.translation.content,
          excerpt: data.translation.excerpt ?? "",
          status: "AI_DRAFT",
        },
      }))
    }
    setTranslating(null)
  }

  const t = translations[activeLocale]
  const viewOnSiteUrl = categorySlug && articleSlug
    ? `/en/knowledge/${categorySlug}/${articleSlug}`
    : null

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/articles")}
            aria-label="Back to articles"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-semibold text-gray-900">
            {id === "new" ? "New article" : "Edit article"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* View on site */}
          {viewOnSiteUrl && (
            <Link
              href={viewOnSiteUrl}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:text-[#EC6E1E] hover:bg-orange-50 transition-colors border border-gray-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View on site
            </Link>
          )}

          {/* Preview */}
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:text-[#EC6E1E] hover:bg-orange-50 transition-colors border border-gray-200"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>

          <div className="w-px h-5 bg-gray-200" />

          <button
            onClick={() => setIsGated(!isGated)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isGated ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            {isGated ? "Gated" : "Public"}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#EC6E1E] text-white text-sm font-medium rounded-lg hover:bg-[#d4601a] disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* ── Preview overlay ── */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#f5f6f8]">
          {/* Preview header */}
          <div className="flex items-center justify-between px-6 py-3 bg-[#1a1a2c] text-white shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#EC6E1E]">
                Preview
              </span>
              <span className="text-xs text-white/40">{t.title}</span>
            </div>
            <div className="flex items-center gap-3">
              {viewOnSiteUrl && (
                <Link
                  href={viewOnSiteUrl}
                  target="_blank"
                  className="text-xs text-white/60 hover:text-[#EC6E1E] transition-colors font-medium flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on site
                </Link>
              )}
              <button
                onClick={() => setShowPreview(false)}
                className="text-white/60 hover:text-white text-2xl font-light leading-none transition-colors"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Preview body — mirrors public article layout */}
          <div className="flex-1 overflow-auto">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 my-8 mx-4 sm:mx-auto px-8 sm:px-12 py-10">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-6 pb-6 border-b border-gray-100">
                {t.title || <span className="text-gray-300 italic">No title</span>}
              </h1>
              <div className="prose prose-gray max-w-none">
                <RichEditor
                  key={`preview-${activeLocale}`}
                  content={t.content}
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Locale tabs */}
      <div className="flex border-b border-gray-200 bg-white px-6">
        {LOCALES.map((loc) => {
          const locT = translations[loc]
          const hasContent = !!locT.title
          return (
            <button
              key={loc}
              onClick={() => setActiveLocale(loc)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeLocale === loc
                  ? "border-[#EC6E1E] text-[#EC6E1E]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {LOCALE_LABELS[loc]}
              {hasContent && (
                <span
                  className={`ml-2 inline-block w-1.5 h-1.5 rounded-full ${
                    locT.status === "PUBLISHED"
                      ? "bg-green-500"
                      : locT.status === "AI_DRAFT"
                        ? "bg-purple-400"
                        : "bg-gray-300"
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main editor */}
        <div className="flex-1 overflow-auto p-6">
          {/* AI translate button (non-English) */}
          {activeLocale !== "en" && (
            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={() => generateTranslation(activeLocale)}
                disabled={!!translating || !translations.en.title}
                className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors border border-purple-200"
              >
                <Wand2 className="w-4 h-4" />
                {translating === activeLocale
                  ? "Generating…"
                  : "Generate AI translation from English"}
              </button>
              {t.status === "AI_DRAFT" && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  AI draft — please review
                </span>
              )}
            </div>
          )}

          <input
            type="text"
            value={t.title}
            onChange={(e) =>
              setTranslations((prev) => ({
                ...prev,
                [activeLocale]: { ...prev[activeLocale], title: e.target.value },
              }))
            }
            placeholder={contentLoaded ? "Article title…" : "Loading…"}
            disabled={!contentLoaded}
            className="w-full text-2xl font-bold text-gray-900 border-0 border-b border-gray-200 pb-3 mb-6 focus:outline-none focus:border-[#EC6E1E] bg-transparent disabled:opacity-50"
          />

          {contentLoaded ? (
            <RichEditor
              key={activeLocale}
              content={t.content}
              onChange={(content) =>
                setTranslations((prev) => ({
                  ...prev,
                  [activeLocale]: { ...prev[activeLocale], content },
                }))
              }
            />
          ) : (
            <div className="border border-gray-200 rounded-xl min-h-[400px] bg-white flex items-center justify-center">
              <span className="text-gray-400 text-sm animate-pulse">Loading content…</span>
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Excerpt (for article list)
            </label>
            <textarea
              value={t.excerpt}
              onChange={(e) =>
                setTranslations((prev) => ({
                  ...prev,
                  [activeLocale]: { ...prev[activeLocale], excerpt: e.target.value },
                }))
              }
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Right panel */}
        <aside className="w-60 border-l border-gray-200 bg-white p-4 space-y-5 overflow-auto">
          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Status
            </label>
            <select
              value={t.status}
              onChange={(e) =>
                setTranslations((prev) => ({
                  ...prev,
                  [activeLocale]: { ...prev[activeLocale], status: e.target.value },
                }))
              }
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="DRAFT">Draft</option>
              <option value="AI_DRAFT">AI Draft</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">— No category —</option>
              {categories
                .filter((c) => !c.parentId) // top-level only
                .map((parent) => (
                  <optgroup key={parent.id} label={parent.name}>
                    <option value={parent.id}>{parent.name}</option>
                    {parent.children.map((child) => (
                      <option key={child.id} value={child.id}>
                        ↳ {child.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-1.5">
              Save to apply category change
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
