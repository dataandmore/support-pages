"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface SearchBarProps {
  locale: string
  placeholder?: string
  compact?: boolean
}

export function SearchBar({ locale, placeholder, compact = false }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="relative w-full">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder ?? "Search…"}
          className="w-full px-4 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#EC6E1E] focus:border-[#EC6E1E] focus:bg-white transition-colors"
        />
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-2xl mx-auto w-full">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder ?? "Search for articles, guides, videos…"}
        className="flex-1 px-5 py-3.5 rounded-xl text-gray-900 text-base bg-white shadow-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#EC6E1E] placeholder:text-gray-400"
      />
      <button
        type="submit"
        className="bg-[#EC6E1E] hover:bg-[#d4601a] text-white text-sm font-semibold px-6 py-3.5 rounded-xl transition-colors"
      >
        Search
      </button>
    </form>
  )
}
