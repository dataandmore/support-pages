import type { Metadata } from "next"
import { isValidLocale, defaultLocale, localeNames } from "@/lib/i18n"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  // locale is read for potential future use; suppress unused-var lint
  void (isValidLocale(locale) ? locale : defaultLocale)
  return {
    title: {
      default: "Data & More Support",
      template: "%s | Data & More Support",
    },
    description: "Support portal for Data & More compliance solutions",
    alternates: {
      languages: Object.fromEntries(
        Object.entries(localeNames).map(([l]) => [l, `/${l}`])
      ),
    },
  }
}

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  return <>{children}</>
}
