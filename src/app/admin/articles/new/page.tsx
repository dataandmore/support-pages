"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function NewArticlePage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [creating, setCreating] = useState(false)

  async function create() {
    if (!title.trim()) return
    setCreating(true)
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content: {}, locale: "en" }),
    })
    const { article } = await res.json()
    router.push(`/admin/articles/${article.id}`)
  }

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New article</h1>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Article title (English)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          autoFocus
          placeholder="e.g. How to connect Microsoft 365"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <button
          onClick={create}
          disabled={!title.trim() || creating}
          className="w-full py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          {creating ? "Creating…" : "Create article"}
        </button>
      </div>
    </div>
  )
}
