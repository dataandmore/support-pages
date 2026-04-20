import { Header } from "./Header"
import { Footer } from "./Footer"
import { PublicSidebar } from "./PublicSidebar"

interface PublicShellProps {
  locale: string
  children: React.ReactNode
  /** Hide the compact search bar in the header (homepage has its own hero search) */
  hideSearch?: boolean
}

/**
 * Global shell for all public pages.
 * Renders: sticky Header → [CollapsibleSidebar | content] → Footer.
 *
 * CollapsibleSidebar manages its own responsive behaviour:
 *  - Desktop (lg+): inline sidebar, collapsible with width transition + localStorage
 *  - Mobile (<lg):  hidden by default, slides in as a drawer via a pull-tab
 */
export function PublicShell({ locale, children, hideSearch = false }: PublicShellProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f5f6f8" }}>
      <Header locale={locale} hideSearch={hideSearch} />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar — responsive behaviour handled inside CollapsibleSidebar */}
        <PublicSidebar locale={locale} />

        {/* Page content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {children}
        </div>
      </div>

      <Footer />
    </div>
  )
}
