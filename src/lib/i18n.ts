export const locales = ["en", "da", "sv", "de"] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"

export const localeNames: Record<Locale, string> = {
  en: "English",
  da: "Dansk",
  sv: "Svenska",
  de: "Deutsch",
}

export const localeFlags: Record<Locale, string> = {
  en: "🇬🇧",
  da: "🇩🇰",
  sv: "🇸🇪",
  de: "🇩🇪",
}

export function isValidLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

export function getLocaleFromCookie(cookie: string | undefined): Locale {
  if (!cookie) return defaultLocale
  return isValidLocale(cookie) ? cookie : defaultLocale
}
