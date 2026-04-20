"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Video,
  Image,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ExternalLink,
} from "lucide-react"
import { useState } from "react"

interface SidebarProps {
  role: string
  userEmail: string
  userName: string
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/articles", label: "Articles", icon: FileText },
  { href: "/admin/categories", label: "Categories", icon: FolderOpen },
  { href: "/admin/videos", label: "Videos", icon: Video },
  { href: "/admin/media", label: "Media", icon: Image },
]

const adminItems = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function Sidebar({ role, userEmail, userName }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-200 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
        {!collapsed && (
          <Link href="/admin" className="font-semibold text-gray-900 text-sm">
            D&amp;M Support CMS
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 ml-auto"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive(item.href, item.exact)
                ? "bg-orange-50 text-[#EC6E1E] font-medium"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}

        {role === "ADMIN" && (
          <>
            <div className={`my-2 border-t border-gray-100 ${collapsed ? "mx-2" : "mx-1"}`} />
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive(item.href)
                    ? "bg-orange-50 text-[#EC6E1E] font-medium"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* View frontend */}
      <div className="px-2 pb-2">
        <Link
          href="/en"
          target="_blank"
          rel="noopener noreferrer"
          title="View public site"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors w-full"
        >
          <ExternalLink className="w-4 h-4 shrink-0" />
          {!collapsed && <span>View site</span>}
        </Link>
      </div>

      {/* User + logout */}
      <div className="border-t border-gray-100 p-3">
        {!collapsed && (
          <div className="mb-2 px-2">
            <p className="text-xs font-medium text-gray-900 truncate">{userName || userEmail}</p>
            <p className="text-xs text-gray-400 truncate">{userEmail}</p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/en/login" })}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
