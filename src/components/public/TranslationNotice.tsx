"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface TranslationNoticeProps {
  articleId: string
  /** The locale the user wanted but has no translation */
  requestedLocale: string
  requestedLocaleName: string
  /** The locale we fell back to (always "en") */
  fallbackLocaleName: string
}

export function TranslationNotice({
  articleId,
  requestedLocale,
  requestedLocaleName,
  fallbackLocaleName,
}: TranslationNoticeProps) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const router = useRouter()

  async function handleTranslate() {
    setState("loading")
    try {
      const res = await fetch(`/api/translate/${articleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLocale: requestedLocale }),
      })
      if (!res.ok) throw new Error(await res.text())
      setState("done")
      // Refresh the page — the new translation is now in the DB
      router.refresh()
    } catch {
      setState("error")
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#EC6E1E]">
          Not available in {requestedLocaleName}
        </p>
        <p className="text-sm text-orange-700/80 mt-0.5">
          You are currently viewing the {fallbackLocaleName} version.
        </p>
      </div>

      {state === "idle" && (
        <button
          onClick={handleTranslate}
          className="shrink-0 bg-[#EC6E1E] hover:bg-[#d4601a] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          Translate to {requestedLocaleName}
        </button>
      )}

      {state === "loading" && (
        <span className="shrink-0 text-sm text-orange-700 animate-pulse">
          Translating…
        </span>
      )}

      {state === "done" && (
        <span className="shrink-0 text-sm font-medium text-green-700">
          Translation ready!
        </span>
      )}

      {state === "error" && (
        <span className="shrink-0 text-sm text-red-600">
          Translation failed — try again later.
        </span>
      )}
    </div>
  )
}
