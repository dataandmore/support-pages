"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"

interface SidebarNavLinkProps {
  href: string
  children: React.ReactNode
  count?: number
  icon?: LucideIcon
  /** Sidebar is in collapsed (icon-only) mode */
  collapsed?: boolean
  /** Use exact match instead of prefix match (prevents /en matching /en/knowledge/…) */
  exact?: boolean
}

export function SidebarNavLink({
  href,
  children,
  count,
  icon: Icon,
  collapsed = false,
  exact = false,
}: SidebarNavLinkProps) {
  const pathname = usePathname()
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/")

  return (
    <Link
      href={href}
      title={collapsed ? String(children) : undefined}
      className={`flex items-center py-2 rounded-lg text-sm transition-colors ${
        collapsed ? "w-10 justify-center" : "gap-2.5 px-3"
      } ${
        isActive
          ? "bg-orange-50 text-[#EC6E1E] font-semibold"
          : "text-gray-500 hover:bg-gray-100 hover:text-[#2A2A2C]"
      }`}
    >
      {Icon && (
        <Icon
          size={16}
          className="shrink-0"
          strokeWidth={isActive ? 2.5 : 1.75}
        />
      )}
      {!collapsed && (
        <>
          <span className="truncate leading-snug flex-1">{children}</span>
          {count !== undefined && (
            <span
              className={`ml-auto shrink-0 text-xs tabular-nums ${
                isActive ? "text-[#EC6E1E]/70" : "text-gray-400"
              }`}
            >
              {count}
            </span>
          )}
        </>
      )}
    </Link>
  )
}
