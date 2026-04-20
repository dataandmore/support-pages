"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

export function DeleteArticleButton({ articleId }: { articleId: string }) {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    try {
      await fetch(`/api/articles/${articleId}`, { method: "DELETE" })
      router.refresh()
    } finally {
      setLoading(false)
      setConfirm(false)
    }
  }

  if (confirm) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-[11px] font-semibold px-2 py-0.5 rounded bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
        >
          {loading ? "…" : "Delete"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-[11px] text-gray-400 hover:text-gray-600 px-1"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      title="Delete article"
      className="p-1.5 rounded hover:bg-red-50 hover:text-red-500 inline-flex text-gray-400 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
