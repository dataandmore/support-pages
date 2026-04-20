"use client"

interface HubspotPreviewModalProps {
  slug: string
  onClose: () => void
}

export function HubspotPreviewModal({ slug, onClose }: HubspotPreviewModalProps) {
  const localPath = `/api/hubspot-archive/${slug}`
  const liveUrl = `https://support.dataandmore.com/en/knowledge/${slug}`

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#1a1a2c] text-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#EC6E1E] shrink-0">
            HubSpot Archive
          </span>
          <span className="text-xs text-white/40 truncate hidden sm:block">{liveUrl}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/60 hover:text-[#EC6E1E] transition-colors font-medium"
          >
            Open live original ↗
          </a>
          <a
            href={`/hubspot-archive/${slug}.html`}
            download={`${slug}.html`}
            className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            Download HTML
          </a>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-white/60 hover:text-white text-2xl font-light leading-none transition-colors ml-1"
          >
            ×
          </button>
        </div>
      </div>

      {/* Iframe — loads the local archived HTML */}
      <iframe
        src={localPath}
        title={`HubSpot archive — ${slug}`}
        className="flex-1 w-full bg-white"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    </div>
  )
}
