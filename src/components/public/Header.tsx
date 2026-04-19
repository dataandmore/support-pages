"use client"

import Link from "next/link"
import Image from "next/image"
import { isValidLocale, defaultLocale } from "@/lib/i18n"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { SearchBar } from "./SearchBar"
import { useState } from "react"

interface HeaderProps {
  locale: string
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
          <Link href={`/${validLocale}`} className="flex items-center shrink-0">
            <Image
              src="/logo-dark.png"
              alt="Data & More"
              width={140}
              height={40}
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop search bar */}
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
              className="hidden sm:inline-flex items-center text-sm text-gray-600 hover:text-[#EC6E1E] px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors font-medium"
            >
              Sign in
            </Link>

            {/* Mobile toggle — text only, no icon */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="sm:hidden text-sm font-medium text-gray-600 hover:text-[#EC6E1E] px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="sm:hidden border-t border-gray-100 py-4 space-y-4">
            {!hideSearch && <SearchBar locale={validLocale} compact />}
            <div className="flex items-center justify-between">
              <LanguageSwitcher currentLocale={validLocale} />
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="text-sm text-[#EC6E1E] font-medium hover:underline"
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
