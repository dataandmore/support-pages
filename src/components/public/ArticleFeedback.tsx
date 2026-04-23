"use client"

import { useState, useEffect } from "react"
import { ThumbsUp, ThumbsDown, CheckCircle } from "lucide-react"

export function ArticleFeedback({
  articleId,
  locale,
}: {
  articleId: string
  locale: string
}) {
  const [selection, setSelection] = useState<"up" | "down" | null>(null)
  const [comment, setComment] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const storageKey = `feedback-${articleId}`

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey)) setSubmitted(true)
    } catch {}
  }, [storageKey])

  async function submit(helpful: boolean, text?: string) {
    setLoading(true)
    try {
      await fetch("/api/analytics/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          locale,
          helpful,
          comment: text || undefined,
        }),
      })
      setSubmitted(true)
      try { localStorage.setItem(storageKey, "1") } catch {}
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  function handleThumb(type: "up" | "down") {
    setSelection(type)
  }

  function handleSubmit() {
    if (!selection) return
    submit(selection === "up", comment)
  }

  function handleQuickSubmit(type: "up" | "down") {
    // If they just click thumbs without comment, submit immediately
    // But if they already selected, show the comment box
    if (selection === null) {
      setSelection(type)
    }
  }

  if (submitted) {
    return (
      <div className="mt-8 pt-6 border-t border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>Thanks for your feedback!</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-100">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-gray-700">Was this article helpful?</p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleQuickSubmit("up")}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
              selection === "up"
                ? "border-[#EC6E1E] bg-orange-50 text-[#EC6E1E]"
                : "border-gray-200 text-gray-500 hover:border-[#EC6E1E] hover:text-[#EC6E1E]"
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            Yes
          </button>
          <button
            onClick={() => handleThumb("down")}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
              selection === "down"
                ? "border-red-400 bg-red-50 text-red-500"
                : "border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-500"
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
            No
          </button>
        </div>

        {selection && (
          <div className="animate-fade-in flex flex-col gap-2 max-w-md">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                selection === "up"
                  ? "What was most helpful? (optional)"
                  : "How can we improve this article? (optional)"
              }
              maxLength={1000}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-[#EC6E1E] focus:ring-1 focus:ring-[#EC6E1E]"
            />
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="self-start px-4 py-1.5 bg-[#EC6E1E] text-white text-sm font-medium rounded-lg hover:bg-[#d4601a] transition-colors disabled:opacity-50"
            >
              {loading ? "Sending..." : "Submit feedback"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
