"use client"

import { useRouter, usePathname } from "next/navigation"
import { locales, localeNames, localeFlags } from "@/lib/i18n"

interface LanguageSwitcherProps {
  currentLocale: string
}

export function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()

  function switchLocale(newLocale: string) {
    // Persist in cookie (1 year)
    document.cookie = `locale=${newLocale};path=/;max-age=31536000;SameSite=Lax`
    // Replace locale segment in current URL
    const segments = pathname.split("/")
    if (segments[1] === currentLocale) {
      segments[1] = newLocale
    } else {
      segments.splice(1, 0, newLocale)
    }
    router.push(segments.join("/"))
  }

  return (
    <div className="relative">
      <select
        value={currentLocale}
        onChange={(e) => switchLocale(e.target.value)}
        className="appearance-none bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Select language"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeFlags[l]} {localeNames[l]}
          </option>
        ))}
      </select>
    </div>
  )
}
