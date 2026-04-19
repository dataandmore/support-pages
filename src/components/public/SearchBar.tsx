"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

interface SearchBarProps {
  locale: string
  placeholder?: string
  /** Compact mode: smaller padding, for use in the header */
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder ?? "Search articles…"}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-[#EC6E1E] focus:bg-white transition-colors"
        />
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto w-full">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder ?? "Search for articles, guides, videos…"}
        className="w-full pl-12 pr-4 py-3.5 rounded-xl text-gray-900 text-base bg-white shadow-sm border-0 focus:outline-none focus:ring-2 focus:ring-white/60 placeholder:text-gray-400"
      />
    </form>
  )
}
