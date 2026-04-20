"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Play } from "lucide-react"
import { getCategoryIcon } from "@/lib/category-icons"
import { SidebarNavLink } from "./SidebarNavLink"

interface Article {
  slug: string
  title: string
}

interface Category {
  id: string
  slug: string
  icon?: string
  translations: { name: string }[]
  _count: { articles: number }
  articles: Article[]
}

interface CollapsibleSidebarProps {
  categories: Category[]
  locale: string
  labels: { home: string; videos: string; kb: string }
}

const COLLAPSED_WIDTH = 56   // px — 3.5rem
const DEFAULT_WIDTH   = 224  // px — 14rem
const MIN_WIDTH       = 160
const MAX_WIDTH       = 480

/** Nav link list — shared between desktop and mobile renders */
function NavContent({
  categories,
  locale,
  labels,
  pathname,
  expandedSlug,
  collapsed,
  onToggleCategory,
  onNavigate,
}: CollapsibleSidebarProps & {
  pathname: string
  expandedSlug: string | null
  collapsed?: boolean
  onToggleCategory: (slug: string) => void
  onNavigate?: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Top-level nav */}
      <div className="mb-3 space-y-0.5" onClick={onNavigate}>
        <SidebarNavLink href={`/${locale}`} exact icon={Home} collapsed={collapsed}>
          {labels.home}
        </SidebarNavLink>
        <SidebarNavLink href={`/${locale}/videos`} icon={Play} collapsed={collapsed}>
          {labels.videos}
        </SidebarNavLink>
      </div>

      {!collapsed && (
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 py-2">
          {labels.kb}
        </p>
      )}
      {collapsed && <div className="border-t border-gray-100 my-2" />}

      {/* Categories */}
      <div className="space-y-0.5 flex-1">
        {categories.map((cat) => {
          const catHref = `/${locale}/knowledge/${cat.slug}`
          const isActive = pathname === catHref || pathname.startsWith(catHref + "/")
          const isExpanded = expandedSlug === cat.slug
          const activeArticleSlug = isActive ? pathname.split("/")[4] ?? "" : ""

          return (
            <div key={cat.id}>
              <div onClick={() => { onToggleCategory(cat.slug); onNavigate?.() }}>
                <SidebarNavLink
                  href={catHref}
                  count={cat._count.articles}
                  icon={getCategoryIcon(cat.icon ?? null, cat.slug)}
                  collapsed={collapsed}
                >
                  {cat.translations[0]?.name ?? cat.slug}
                </SidebarNavLink>
              </div>

              {!collapsed && isExpanded && cat.articles.length > 0 && (
                <div className="ml-3 mt-0.5 mb-1 border-l-2 border-orange-100 pl-2 space-y-0.5">
                  {cat.articles.map((article) => {
                    const isCurrentArticle = activeArticleSlug === article.slug
                    return (
                      <Link
                        key={article.slug}
                        href={`${catHref}/${article.slug}`}
                        onClick={onNavigate}
                        className={`block px-2 py-1 text-[11px] rounded-md leading-snug transition-colors ${
                          isCurrentArticle
                            ? "text-[#EC6E1E] font-semibold bg-orange-50"
                            : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                        }`}
                      >
                        {article.title}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Admin link */}
      <div className="pt-4 mt-4 border-t border-gray-100">
        <Link
          href="/admin"
          onClick={onNavigate}
          title={collapsed ? "Admin" : undefined}
          className={`flex items-center ${collapsed ? "justify-center px-1" : "px-3"} py-2 text-xs text-gray-400 hover:text-[#EC6E1E] transition-colors rounded-lg hover:bg-gray-50`}
        >
          {collapsed ? "⚙" : "Admin"}
        </Link>
      </div>
    </div>
  )
}

export function CollapsibleSidebar({ categories, locale, labels }: CollapsibleSidebarProps) {
  const [desktopOpen, setDesktopOpen]   = useState(true)
  const [mobileOpen, setMobileOpen]     = useState(false)
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH)
  const [isDragging, setIsDragging]     = useState(false)

  const pathname = usePathname()

  // Restore persisted state
  useEffect(() => {
    const open  = localStorage.getItem("sidebar-open")
    const width = localStorage.getItem("sidebar-width")
    if (open  !== null) setDesktopOpen(open === "true")
    if (width !== null) {
      const w = parseInt(width, 10)
      if (!isNaN(w)) setSidebarWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w)))
    }
  }, [])

  // Auto-expand active category
  useEffect(() => {
    const segs = pathname.split("/")
    if (segs[2] === "knowledge" && segs[3]) setExpandedSlug(segs[3])
  }, [pathname])

  const toggleDesktop = () =>
    setDesktopOpen((v) => {
      const next = !v
      localStorage.setItem("sidebar-open", String(next))
      return next
    })

  function handleToggleCategory(slug: string) {
    setExpandedSlug((prev) => (prev === slug ? null : slug))
  }

  // ── Drag-to-resize ──────────────────────────────────────────────────────────
  // Use refs so event handler callbacks are always fresh without useCallback deps
  const dragState = useRef({ active: false, startX: 0, startWidth: DEFAULT_WIDTH })

  function handleDragStart(e: React.MouseEvent) {
    e.preventDefault()
    dragState.current = { active: true, startX: e.clientX, startWidth: sidebarWidth }
    setIsDragging(true)
    document.body.style.userSelect = "none"
    document.body.style.cursor     = "col-resize"

    function onMove(ev: MouseEvent) {
      if (!dragState.current.active) return
      const newW = Math.max(
        MIN_WIDTH,
        Math.min(MAX_WIDTH, dragState.current.startWidth + ev.clientX - dragState.current.startX)
      )
      setSidebarWidth(newW)
      localStorage.setItem("sidebar-width", String(newW))
    }

    function onUp() {
      dragState.current.active       = false
      document.body.style.userSelect = ""
      document.body.style.cursor     = ""
      setIsDragging(false)
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup",   onUp)
    }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup",   onUp)
  }
  // ────────────────────────────────────────────────────────────────────────────

  const sharedProps = { categories, locale, labels, pathname, expandedSlug, onToggleCategory: handleToggleCategory }

  return (
    <>
      {/* ── Desktop inline sidebar ── */}
      <nav
        aria-label="Site navigation"
        style={{ width: desktopOpen ? sidebarWidth : COLLAPSED_WIDTH }}
        className={`hidden lg:flex flex-col shrink-0 sticky top-16 self-start h-[calc(100vh-4rem)] bg-white overflow-hidden relative ${
          isDragging ? "" : "transition-[width] duration-200 ease-in-out"
        }`}
      >
        {/* Inner — always full open-width; outer nav clips it when collapsed */}
        <div
          style={{ width: sidebarWidth }}
          className="flex flex-col h-full border-r border-gray-100"
        >
          {/* Toggle button */}
          <button
            onClick={toggleDesktop}
            aria-label={desktopOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={desktopOpen}
            className="flex items-center w-full gap-2 px-3 py-3.5 border-b border-gray-100 text-gray-400 hover:text-[#EC6E1E] hover:bg-orange-50/50 transition-colors shrink-0"
          >
            <span className="w-5 h-5 flex items-center justify-center shrink-0 text-base font-bold leading-none">
              {desktopOpen ? "«" : "»"}
            </span>
            <span
              className={`text-xs font-semibold whitespace-nowrap transition-opacity duration-150 ${
                desktopOpen ? "opacity-100" : "opacity-0"
              }`}
            >
              Navigation
            </span>
          </button>

          <div className="flex-1 px-2 py-4 overflow-y-auto overflow-x-hidden">
            <NavContent {...sharedProps} collapsed={!desktopOpen} />
          </div>
        </div>

        {/* Drag handle — right edge, only when sidebar is open */}
        {desktopOpen && (
          <div
            onMouseDown={handleDragStart}
            className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-10 transition-colors ${
              isDragging ? "bg-[#EC6E1E]/50" : "hover:bg-[#EC6E1E]/20"
            }`}
          />
        )}
      </nav>

      {/* ── Mobile: pull-tab ── */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className={`lg:hidden fixed left-0 top-24 z-40 bg-white border border-gray-200 border-l-0 shadow-sm rounded-r-lg px-2 py-3 text-xs font-bold text-gray-400 hover:text-[#EC6E1E] transition-all duration-200 ${
          mobileOpen ? "-translate-x-full opacity-0" : "translate-x-0 opacity-100"
        }`}
      >
        »
      </button>

      {/* ── Mobile: backdrop ── */}
      <div
        onClick={() => setMobileOpen(false)}
        className={`lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* ── Mobile: slide-in drawer ── */}
      <nav
        aria-label="Site navigation"
        className={`lg:hidden fixed left-0 top-16 h-[calc(100vh-4rem)] w-72 max-w-[85vw] bg-white border-r border-gray-100 z-50 flex flex-col shadow-xl transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 shrink-0">
          <span className="text-sm font-semibold text-[#2A2A2C]">Navigation</span>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="text-gray-400 hover:text-[#EC6E1E] transition-colors text-xl font-light leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 px-3 py-4 overflow-y-auto">
          <NavContent {...sharedProps} collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </div>
      </nav>
    </>
  )
}
