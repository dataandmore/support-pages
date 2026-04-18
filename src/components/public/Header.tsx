import Link from "next/link"
import { isValidLocale, defaultLocale } from "@/lib/i18n"
import { LanguageSwitcher } from "./LanguageSwitcher"

interface HeaderProps {
  locale: string
}

export function Header({ locale }: HeaderProps) {
  const validLocale = isValidLocale(locale) ? locale : defaultLocale

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={`/${validLocale}`} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">D&M</span>
            </div>
            <span className="font-semibold text-gray-900 hidden sm:block">
              Data &amp; More
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher currentLocale={validLocale} />
            <Link
              href="/admin"
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
