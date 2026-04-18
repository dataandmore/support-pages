"use client"

import Link from "next/link"
import { isValidLocale, defaultLocale } from "@/lib/i18n"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { SearchBar } from "./SearchBar"
import { Menu, X } from "lucide-react"
import { useState } from "react"

interface HeaderProps {
  locale: string
  /** Set to true on the homepage to hide the search bar (it's in the hero) */
  hideSearch?: boolean
}

export function Header({ locale, hideSearch = false }: HeaderProps) {
  const validLocale = isValidLocale(locale) ? locale : defaultLocale
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Logo */}
          <Link
            href={`/${validLocale}`}
            className="flex items-center gap-2.5 shrink-0"
          >
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold tracking-tight">D&M</span>
            </div>
            <span className="font-semibold text-gray-900 hidden sm:block text-sm">
              Data &amp; More Support
            </span>
          </Link>

          {/* Desktop search bar (hidden on homepage where hero has it) */}
          {!hideSearch && (
            <div className="hidden md:block flex-1 max-w-md">
              <SearchBar locale={validLocale} compact />
            </div>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <LanguageSwitcher currentLocale={validLocale} />
            </div>
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              Sign in
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="sm:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="sm:hidden border-t border-gray-100 py-3 space-y-3 animate-fade-in">
            {!hideSearch && (
              <SearchBar locale={validLocale} compact />
            )}
            <div className="flex items-center justify-between">
              <LanguageSwitcher currentLocale={validLocale} />
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="text-sm text-blue-700 font-medium hover:underline"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
