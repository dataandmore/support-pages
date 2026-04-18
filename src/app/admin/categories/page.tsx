"use client"

import { useEffect, useState } from "react"
import { GripVertical, Lock, Globe } from "lucide-react"

interface Category {
  id: string
  slug: string
  icon: string | null
  isGated: boolean
  position: number
  translations: { locale: string; name: string; description: string | null }[]
  _count: { articles: number }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Categories</h1>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="w-8"></th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Articles</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Access</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Translations</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const en = getTranslation(cat, "en")
              return (
                <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="pl-3 text-gray-300">
                    <GripVertical className="w-4 h-4" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cat.icon}</span>
                      <span className="font-medium text-gray-900">{en?.name ?? cat.slug}</span>
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
                      {cat.isGated ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <Globe className="w-3 h-3" />
                      )}
                      {cat.isGated ? "Gated" : "Public"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {(["en", "da", "sv", "de"] as const).map((loc) => (
                        <span
                          key={loc}
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            getTranslation(cat, loc)
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {loc.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
