"use client"

import { useState, useRef, useEffect } from "react"
import { signOut } from "next-auth/react"
import { LogOut, ExternalLink } from "lucide-react"
import Link from "next/link"

interface AdminHeaderProps {
  userName: string
  userEmail: string
  userImage?: string
}

export function AdminHeader({ userName, userEmail, userImage }: AdminHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
    <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-end px-4 shrink-0">
      <div className="flex items-center gap-3">
        <Link
          href="/en"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-[#EC6E1E] transition-colors flex items-center gap-1"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View site
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-orange-200 transition-all"
          >
            {userImage ? (
              <img
                src={userImage}
                alt={userName}
                className="w-8 h-8 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#EC6E1E] flex items-center justify-center text-white text-xs font-bold">
                {(userName?.[0] ?? userEmail?.[0] ?? "?").toUpperCase()}
              </div>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/en/login" })}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
