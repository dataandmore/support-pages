import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Redirect root to /en
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/en", req.url))
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
  ],
}
