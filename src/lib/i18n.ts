export const locales = ["en", "da", "sv", "de"] as const
export type Locale = typeof locales[number]
export const defaultLocale: Locale = "en"
export const localeNames: Record<Locale, string> = {
  en: "English",
  da: "Dansk",
  sv: "Svenska",
  de: "Deutsch",
}
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale)
}
