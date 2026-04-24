"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Video,
  Image,
  Users,
  Settings,
  ChevronLeft,
} from "lucide-react"
import { useState } from "react"

interface SidebarProps {
  role: string
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

export function Sidebar({ role }: SidebarProps) {
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
      {/* Header / collapse toggle */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-gray-200 shrink-0">
        {!collapsed && (
          <span className="text-sm font-bold text-[#2A2A2C] truncate">D&M Support CMS</span>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className={`text-gray-400 hover:text-gray-600 transition-colors ${collapsed ? "mx-auto" : ""}`}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.href, item.exact)
                ? "bg-orange-50 text-[#EC6E1E]"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            } ${collapsed ? "justify-center px-2" : ""}`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}

        {role === "ADMIN" && (
          <>
            <div className={`my-3 border-t border-gray-100 ${collapsed ? "mx-1" : "mx-2"}`} />
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-orange-50 text-[#EC6E1E]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                } ${collapsed ? "justify-center px-2" : ""}`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}
