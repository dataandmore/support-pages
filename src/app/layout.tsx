import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/Providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Data & More Support Center",
    template: "%s | Data & More Support",
  },
  description:
    "Get help with Data & More products. Browse articles, guides, and video tutorials.",
  openGraph: {
    type: "website",
    siteName: "Data & More Support Center",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{<Providers>{children}</Providers>}</body>
    </html>
  )
}
