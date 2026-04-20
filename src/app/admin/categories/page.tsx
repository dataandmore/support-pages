"use client"

import { useEffect, useState } from "react"
import { GripVertical, Globe, Lock, Plus, X, Pencil, type LucideIcon } from "lucide-react"
import {
  CATEGORY_ICONS, resolveIcon, getCategoryIcon,
} from "@/lib/category-icons"

export { getCategoryIcon, resolveIcon, CATEGORY_ICONS }

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string
  slug: string
  icon: string | null
  isGated: boolean
  position: number
  parentId: string | null
  translations: { locale: string; name: string; description: string | null }[]
  _count: { articles: number }
  children?: Category[]
}

// ─── New-category form ────────────────────────────────────────────────────────

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function NewCategoryPanel({ onCreated, onCancel, availableParents }: {
  onCreated: (cat: Category) => void
  onCancel: () => void
  availableParents: Category[]
}) {
  const [name, setName]               = useState("")
  const [slug, setSlug]               = useState("")
  const [description, setDescription] = useState("")
  const [selectedIcon, setSelectedIcon] = useState<string>("FolderOpen")
  const [parentId, setParentId]       = useState<string>("")
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)

  function handleNameChange(v: string) {
    setName(v)
    setSlug(slugify(v))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, icon: selectedIcon, description, parentId: parentId || null }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? "Failed to create category")
      }
      const { category } = await res.json()
      onCreated(category)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  const SelectedIcon = resolveIcon(selectedIcon)

  return (
    <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          {SelectedIcon && <SelectedIcon size={18} className="text-[#EC6E1E]" />}
          New category
        </h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Icon picker */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Icon
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ICONS.map(({ name, Icon, label }) => (
              <button
                key={name}
                type="button"
                title={label}
                onClick={() => setSelectedIcon(name)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl border-2 transition-all ${
                  selectedIcon === name
                    ? "border-[#EC6E1E] bg-orange-50 text-[#EC6E1E]"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <Icon size={18} strokeWidth={selectedIcon === name ? 2.5 : 1.75} />
              </button>
            ))}
          </div>
        </div>

        {/* Name + slug */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Name (English)
            </label>
            <input
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Getting Started"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC6E1E]/30 focus:border-[#EC6E1E]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Slug
            </label>
            <input
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. getting-started"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#EC6E1E]/30 focus:border-[#EC6E1E]"
            />
          </div>
        </div>

        {/* Description + Parent */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Description <span className="text-gray-400 normal-case font-normal">(optional)</span>
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description shown on the homepage"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC6E1E]/30 focus:border-[#EC6E1E]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Parent category <span className="text-gray-400 normal-case font-normal">(subcategory)</span>
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC6E1E]/30 focus:border-[#EC6E1E]"
            >
              <option value="">— Top-level —</option>
              {availableParents.filter((p) => !p.parentId).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.translations.find((t) => t.locale === "en")?.name ?? p.slug}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#EC6E1E] hover:bg-[#d4601a] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            {saving ? "Creating…" : "Create category"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Edit panel ───────────────────────────────────────────────────────────────

function EditCategoryPanel({ category, onSaved, onCancel }: {
  category: Category
  onSaved: (cat: Category) => void
  onCancel: () => void
}) {
  const enT = category.translations.find((t) => t.locale === "en")
  const [name, setName]               = useState(enT?.name ?? "")
  const [description, setDescription] = useState(enT?.description ?? "")
  const [selectedIcon, setSelectedIcon] = useState<string>(category.icon ?? "FolderOpen")
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const SelectedIcon = resolveIcon(selectedIcon)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icon: selectedIcon,
          translations: { en: { name, description } },
        }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? "Failed to update")
      }
      const { category: updated } = await res.json()
      onSaved(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr>
      <td colSpan={5} className="px-4 py-5 bg-orange-50/40 border-b border-orange-100">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              {SelectedIcon && <SelectedIcon size={16} className="text-[#EC6E1E]" />}
              Edit — {enT?.name ?? category.slug}
            </h3>
            <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          {/* Icon picker */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Icon</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_ICONS.map(({ name: iName, Icon, label }) => (
                <button
                  key={iName}
                  type="button"
                  title={label}
                  onClick={() => setSelectedIcon(iName)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg border-2 transition-all ${
                    selectedIcon === iName
                      ? "border-[#EC6E1E] bg-orange-50 text-[#EC6E1E]"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <Icon size={16} strokeWidth={selectedIcon === iName ? 2.5 : 1.75} />
                </button>
              ))}
            </div>
          </div>

          {/* Name + description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Name (English)
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC6E1E]/30 focus:border-[#EC6E1E]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC6E1E]/30 focus:border-[#EC6E1E]"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#EC6E1E] hover:bg-[#d4601a] disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </td>
    </tr>
  )
}

// ─── CategoryRows — renders one row + its children recursively ────────────────

function CategoryRows({
  cat, editingId, setEditingId, toggleGated, handleSaved, getTranslation, indent,
}: {
  cat: Category
  editingId: string | null
  setEditingId: (id: string | null) => void
  toggleGated: (cat: Category) => void
  handleSaved: (cat: Category) => void
  getTranslation: (cat: Category, locale: string) => { locale: string; name: string; description: string | null } | undefined
  indent: boolean
}) {
  const en = getTranslation(cat, "en")
  const CatIcon = getCategoryIcon(cat.icon, cat.slug)
  const isEditing = editingId === cat.id

  return (
    <>
      <tr className={`border-b border-gray-50 transition-colors ${isEditing ? "bg-orange-50/30" : "hover:bg-gray-50"}`}>
        <td className="pl-3 text-gray-300">
          <GripVertical className="w-4 h-4" />
        </td>
        <td className="px-4 py-3">
          <div className={`flex items-center gap-2.5 ${indent ? "pl-5" : ""}`}>
            {indent && <span className="text-gray-300 text-sm mr-0.5">↳</span>}
            <CatIcon size={indent ? 15 : 18} className="text-gray-500 shrink-0" strokeWidth={1.75} />
            <span className={`font-medium text-gray-900 ${indent ? "text-sm" : ""}`}>{en?.name ?? cat.slug}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-gray-500">{cat._count.articles}</td>
        <td className="px-4 py-3">
          <button
            onClick={() => toggleGated(cat)}
            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium transition-colors ${
              cat.isGated ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {cat.isGated ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
            {cat.isGated ? "Gated" : "Public"}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1">
            {(["en", "da", "sv", "de"] as const).map((loc) => (
              <span
                key={loc}
                className={`text-xs px-1.5 py-0.5 rounded ${
                  getTranslation(cat, loc) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                }`}
              >
                {loc.toUpperCase()}
              </span>
            ))}
          </div>
        </td>
        <td className="pr-3 text-right">
          <button
            onClick={() => setEditingId(isEditing ? null : cat.id)}
            title="Edit category"
            className={`p-1.5 rounded-lg transition-colors ${
              isEditing ? "text-[#EC6E1E] bg-orange-50" : "text-gray-400 hover:text-[#EC6E1E] hover:bg-orange-50"
            }`}
          >
            <Pencil size={14} />
          </button>
        </td>
      </tr>

      {isEditing && (
        <EditCategoryPanel
          key={`edit-${cat.id}`}
          category={cat}
          onSaved={handleSaved}
          onCancel={() => setEditingId(null)}
        />
      )}

      {/* Render children (subcategories) indented */}
      {(cat.children ?? []).map((child) => (
        <CategoryRows
          key={child.id}
          cat={child}
          editingId={editingId}
          setEditingId={setEditingId}
          toggleGated={toggleGated}
          handleSaved={handleSaved}
          getTranslation={getTranslation}
          indent
        />
      ))}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]       = useState(true)
  const [showNew, setShowNew]       = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(({ categories }) => {
        setCategories(categories)
        setLoading(false)
      })
  }, [])

  function getTranslation(cat: Category, locale: string) {
    return cat.translations.find((t) => t.locale === locale)
  }

  async function toggleGated(cat: Category) {
    await fetch(`/api/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isGated: !cat.isGated }),
    })
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, isGated: !c.isGated } : c))
    )
  }

  function handleCreated(cat: Category) {
    setCategories((prev) => [...prev, cat])
    setShowNew(false)
  }

  function handleSaved(updated: Category) {
    setCategories((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)))
    setEditingId(null)
  }

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        {!showNew && (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-[#EC6E1E] hover:bg-[#d4601a] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            New category
          </button>
        )}
      </div>

      {showNew && (
        <NewCategoryPanel
          onCreated={handleCreated}
          onCancel={() => setShowNew(false)}
          availableParents={categories}
        />
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="w-8"></th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Articles</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Access</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Translations</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {categories.filter((c) => !c.parentId).map((cat) => (
              <CategoryRows
                key={cat.id}
                cat={cat}
                editingId={editingId}
                setEditingId={setEditingId}
                toggleGated={toggleGated}
                handleSaved={handleSaved}
                getTranslation={getTranslation}
                indent={false}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
