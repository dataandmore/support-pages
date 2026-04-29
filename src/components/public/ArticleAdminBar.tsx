"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Pin, PinOff, ExternalLink } from "lucide-react"
import { QuickLoginModal } from "./QuickLoginModal"
import { HubspotPreviewModal } from "./HubspotPreviewModal"

interface ArticleAdminBarProps {
  articleId: string
  articleSlug: string
  /** Whether the current visitor is already authenticated as admin */
  isAuthenticated: boolean
  /** Whether a local HubSpot archive exists for this slug */
  hasArchive: boolean
  /** Whether this article is currently pinned to the homepage */
  isPinned: boolean
}

export function ArticleAdminBar({
  articleId,
  articleSlug,
  isAuthenticated,
  hasArchive,
  isPinned: initialPinned,
}: ArticleAdminBarProps) {
  const [showLogin, setShowLogin] = useState(false)
  const [showHubspot, setShowHubspot] = useState(false)
  const [pinned, setPinned] = useState(initialPinned)
  const [pinLoading, setPinLoading] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()

  // Use client-side session as well (covers Google OAuth JWT)
  const loggedIn = isAuthenticated || !!session?.user
  const role = session?.user?.role ?? ""
  const isAdmin = loggedIn && (["ADMIN", "EDITOR"].includes(role) || (isAuthenticated && !session))

  const editUrl = `/admin/articles/${articleId}`

  function handleEdit() {
    if (loggedIn) {
      router.push(editUrl)
    } else {
      setShowLogin(true)
    }
  }

  async function handleTogglePin() {
    if (!loggedIn) {
      setShowLogin(true)
      return
    }
    setPinLoading(true)
    try {
      const res = await fetch(`/api/articles/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !pinned }),
      })
      if (res.ok) {
        setPinned((v) => !v)
        // Refresh so the homepage updates if needed
        router.refresh()
      }
    } finally {
      setPinLoading(false)
    }
  }

  if (!isAdmin) return null

  return (
    <>
      {/* Floating pill — top-right corner of the article card (admin only) */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
        {/* Pin to dashboard button — always visible (prompts login if unauthenticated) */}
        <button
          onClick={handleTogglePin}
          disabled={pinLoading}
          title={pinned ? "Unpin from homepage" : "Pin to homepage"}
          className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-colors shadow-sm ${
            pinned
              ? "bg-orange-50 border-[#EC6E1E] text-[#EC6E1E] hover:bg-red-50 hover:border-red-400 hover:text-red-500"
              : "border-gray-200 bg-white text-gray-400 hover:border-[#EC6E1E] hover:text-[#EC6E1E]"
          }`}
        >
          {pinned ? (
            <PinOff size={12} className="shrink-0" />
          ) : (
            <Pin size={12} className="shrink-0" />
          )}
          {pinned ? "Pinned" : "Pin"}
        </button>

        {/* Open original HubSpot article in new tab */}
        <a
          href={`https://support.dataandmore.com/en/knowledge/${articleSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open original in HubSpot"
          className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-gray-200 bg-white text-gray-500 hover:border-[#EC6E1E] hover:text-[#EC6E1E] transition-colors shadow-sm"
        >
          <ExternalLink size={11} className="shrink-0" />
          Original
        </a>

        {hasArchive && (
          <button
            onClick={() => setShowHubspot(true)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-gray-200 bg-white text-gray-500 hover:border-[#EC6E1E] hover:text-[#EC6E1E] transition-colors shadow-sm"
          >
            HubSpot
          </button>
        )}
        <button
          onClick={handleEdit}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#EC6E1E] hover:bg-[#d4601a] text-white transition-colors shadow-sm"
        >
          Edit article
        </button>
      </div>

      {/* Quick login popup (for unauthenticated visitors) */}
      {showLogin && (
        <QuickLoginModal
          onClose={() => setShowLogin(false)}
          callbackUrl={editUrl}
        />
      )}

      {/* HubSpot archive viewer */}
      {showHubspot && (
        <HubspotPreviewModal
          slug={articleSlug}
          onClose={() => setShowHubspot(false)}
        />
      )}
    </>
  )
}
