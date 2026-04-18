import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin")
  const isLoggedIn = !!req.auth

  if (isAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/en/login", req.url))
  }

  // Redirect root to /en
  if (req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/en", req.url))
  }
})

export const config = {
  matcher: ["/admin/:path*", "/"],
}
