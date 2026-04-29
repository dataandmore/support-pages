"use client"

import { useRef, useEffect, useState } from "react"
import { Play } from "lucide-react"

interface SynthesiaEmbedProps {
  videoId: string
  locale?: string
  className?: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function SynthesiaEmbed({ videoId, locale, className }: SynthesiaEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [failed, setFailed] = useState(false)

  // Detect if the iframe rendered a raw JSON error (Synthesia API failure)
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const handleLoad = () => {
      try {
        // Cross-origin will throw — that's fine, it means the page loaded normally
        const doc = iframe.contentDocument
        if (doc) {
          const text = doc.body?.innerText?.trim() ?? ""
          if (text.startsWith("{") && text.includes('"message"')) {
            setFailed(true)
          }
        }
      } catch {
        // Cross-origin — page loaded normally
      }
    }
    iframe.addEventListener("load", handleLoad)
    return () => iframe.removeEventListener("load", handleLoad)
  }, [])

  if (!UUID_RE.test(videoId)) return null

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 ${className ?? "w-full h-full"}`}>
        <Play size={32} className="text-white/30" />
      </div>
    )
  }

  const localeParam = locale ? `?language=${locale}` : ""

  return (
    <iframe
      ref={iframeRef}
      src={`https://share.synthesia.io/embeds/videos/${videoId}${localeParam}`}
      loading="lazy"
      title="Video"
      allow="encrypted-media; fullscreen"
      allowFullScreen
      style={{ border: "none" }}
      className={className ?? "w-full h-full"}
      onError={() => setFailed(true)}
    />
  )
}
