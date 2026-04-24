"use client"

import Link from "next/link"
import Image from "next/image"
import { isValidLocale, defaultLocale } from "@/lib/i18n"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { SearchBar } from "./SearchBar"
import { useState, useRef, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"

interface HeaderProps {
  locale: string
  hideSearch?: boolean
}

export function Header({ locale, hideSearch = false }: HeaderProps) {
  const validLocale = isValidLocale(locale) ? locale : defaultLocale
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [menuOpen])

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
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

            {session?.user ? (
              /* Signed-in user avatar + dropdown */
              <div className="relative hidden sm:block" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-orange-200 transition-all"
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name ?? ""}
                      className="w-8 h-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#EC6E1E] flex items-center justify-center text-white text-xs font-bold">
                      {(session.user.name?.[0] ?? session.user.email?.[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50 animate-fade-in">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{session.user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                    </div>
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-[#EC6E1E] transition-colors"
                    >
                      Admin
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: `/${validLocale}` })}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-[#EC6E1E] transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center text-sm text-gray-600 hover:text-[#EC6E1E] px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors font-medium"
              >
                Sign in
              </Link>
            )}

            {/* Mobile toggle */}
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
              {session?.user ? (
                <div className="flex items-center gap-3">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  <button
                    onClick={() => signOut({ callbackUrl: `/${validLocale}` })}
                    className="text-sm text-[#EC6E1E] font-medium hover:underline"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-[#EC6E1E] font-medium hover:underline"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
