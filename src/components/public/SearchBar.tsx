"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

interface SearchBarProps {
  locale: string
  placeholder?: string
}

export function SearchBar({ locale, placeholder }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder ?? "Search for articles, guides, videos…"}
          className="w-full pl-12 pr-4 py-3 rounded-xl text-gray-900 text-base shadow-sm border-0 focus:outline-none focus:ring-2 focus:ring-white/50"
        />
      </div>
    </form>
  )
}
