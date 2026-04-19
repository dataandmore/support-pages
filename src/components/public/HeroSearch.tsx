"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

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
    <form onSubmit={handleSubmit} className="relative w-full max-w-xl mx-auto">
      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search articles, guides, videos…"
        className="w-full pl-14 pr-32 py-4 rounded-2xl text-gray-900 text-base bg-white shadow-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#EC6E1E] placeholder:text-gray-400"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#EC6E1E] hover:bg-[#d4601a] text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
      >
        Search
      </button>
    </form>
  )
}
