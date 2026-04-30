"use client"

import { useState } from "react"
import { Share2, Check } from "lucide-react"

interface ShareButtonProps {
  path: string
  className?: string
}

export function ShareButton({ path, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  function handleShare(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}${path}`

    if (navigator.share) {
      navigator.share({ url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  return (
    <button
      onClick={handleShare}
      title={copied ? "Link copied!" : "Share"}
      className={className ?? "p-1.5 rounded-md text-gray-400 hover:text-[#EC6E1E] hover:bg-orange-50 transition-colors"}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Share2 className="w-3.5 h-3.5" />
      )}
    </button>
  )
}
