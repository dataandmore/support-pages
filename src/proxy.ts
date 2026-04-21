import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { locales } from "@/lib/i18n"

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Redirect root to /en
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/en", req.url))
  }

  // If path doesn't start with a known locale, redirect to /en/[path]
  // e.g. /knowledge/some-article → /en/knowledge/some-article
  const firstSegment = pathname.split("/")[1]
  if (firstSegment && !(locales as readonly string[]).includes(firstSegment) && !pathname.startsWith("/admin") && !pathname.startsWith("/api") && !pathname.startsWith("/_next") && !pathname.startsWith("/embed")) {
    return NextResponse.redirect(new URL(`/en${pathname}`, req.url))
  }

  // Protect all /admin routes
  if (pathname.startsWith("/admin") && !req.auth) {
    const loginUrl = new URL("/en/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }
})

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mov|ogg|ico)$).*)",
  ],
}
