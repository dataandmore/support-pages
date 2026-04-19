"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { RichEditor } from "@/components/admin/RichEditor"
import { Save, Lock, Wand2 } from "lucide-react"

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

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>()
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

  useEffect(() => {
    if (id === "new") return
    fetch(`/api/articles/${id}`)
      .then((r) => r.json())
      .then(({ article }) => {
        if (!article) return
        setIsGated(article.isGated)
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
        translation: {
          locale: activeLocale,
          title: t.title,
          content: t.content,
          excerpt: t.excerpt,
          status: t.status,
        },
      }),
    })
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

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <h1 className="font-semibold text-gray-900">
          {id === "new" ? "New article" : "Edit article"}
        </h1>
        <div className="flex items-center gap-3">
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
            placeholder="Article title…"
            className="w-full text-2xl font-bold text-gray-900 border-0 border-b border-gray-200 pb-3 mb-6 focus:outline-none focus:border-[#EC6E1E] bg-transparent"
          />

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
        <aside className="w-60 border-l border-gray-200 bg-white p-4 space-y-4 overflow-auto">
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
        </aside>
      </div>
    </div>
  )
}
