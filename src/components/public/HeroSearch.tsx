"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface HeroSearchProps {
  locale: string
}

export function HeroSearch({ locale }: HeroSearchProps) {
  const [query, setQuery] = useState("")
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl mx-auto gap-2">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search articles, guides, videos…"
        className="flex-1 px-5 py-4 rounded-2xl text-gray-900 text-base bg-white shadow-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#EC6E1E] placeholder:text-gray-400"
      />
      <button
        type="submit"
        className="bg-[#EC6E1E] hover:bg-[#d4601a] text-white text-sm font-semibold px-7 py-4 rounded-2xl transition-colors whitespace-nowrap shadow-xl"
      >
        Search
      </button>
    </form>
  )
}
