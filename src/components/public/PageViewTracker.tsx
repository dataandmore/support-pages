"use client"

import { useEffect } from "react"

export function PageViewTracker({
  articleId,
  locale,
}: {
  articleId: string
  locale: string
}) {
  useEffect(() => {
    const body = JSON.stringify({
      articleId,
      locale,
      referrer: document.referrer || undefined,
    })
    try {
      navigator.sendBeacon(
        "/api/analytics/page-view",
        new Blob([body], { type: "application/json" })
      )
    } catch {
      // Fallback for environments without sendBeacon
      fetch("/api/analytics/page-view", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {})
    }
  }, [articleId, locale])

  return null
}
