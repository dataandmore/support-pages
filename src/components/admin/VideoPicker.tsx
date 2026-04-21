"use client"

import { useEffect, useState } from "react"

export type VideoInsertion =
  | { kind: "youtube"; src: string }
  | { kind: "embed"; src: string; title: string }

interface VideoPickerProps {
  onSelect: (insertion: VideoInsertion) => void
  onClose: () => void
}

type Tab = "youtube" | "synthesia" | "library"

interface LibraryVideo {
  id: string
  slug: string
  originalFilename: string
  status: string
  thumbnailPath: string | null
  translations: { locale: string; title: string }[]
}

// Turn a Synthesia share / watch URL into a player iframe URL.
// Accepts IDs, share links (share.synthesia.io/<id>), and embed URLs.
function normalizeSynthesiaUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Already an embed URL — leave it alone.
  if (/^https?:\/\/share\.synthesia\.io\/embeds\//i.test(trimmed)) return trimmed

  // Share URL: https://share.synthesia.io/<uuid>
  const shareMatch = trimmed.match(/share\.synthesia\.io\/([a-f0-9-]{8,})/i)
  if (shareMatch) return `https://share.synthesia.io/embeds/videos/${shareMatch[1]}`

  // Bare UUID
  if (/^[a-f0-9-]{8,}$/i.test(trimmed)) {
    return `https://share.synthesia.io/embeds/videos/${trimmed}`
  }

  return null
}

export function VideoPicker({ onSelect, onClose }: VideoPickerProps) {
  const [tab, setTab] = useState<Tab>("youtube")
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [synthesiaUrl, setSynthesiaUrl] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Library state
  const [library, setLibrary] = useState<LibraryVideo[] | null>(null)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [libraryError, setLibraryError] = useState<string | null>(null)

  // Lazy-load library the first time the tab is opened.
  useEffect(() => {
    if (tab !== "library" || library !== null) return
    setLibraryLoading(true)
    setLibraryError(null)
    fetch("/api/videos")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        return res.json()
      })
      .then((data) => {
        const ready = (data.videos as LibraryVideo[]).filter((v) => v.status === "READY")
        setLibrary(ready)
      })
      .catch((e: unknown) => {
        setLibraryError(e instanceof Error ? e.message : "Failed to load library")
        setLibrary([])
      })
      .finally(() => setLibraryLoading(false))
  }, [tab, library])

  function submitYoutube() {
    setError(null)
    const url = youtubeUrl.trim()
    if (!url) {
      setError("Paste a YouTube URL to continue.")
      return
    }
    if (!/youtu\.?be/i.test(url)) {
      setError("That doesn't look like a YouTube URL.")
      return
    }
    onSelect({ kind: "youtube", src: url })
  }

  function submitSynthesia() {
    setError(null)
    const src = normalizeSynthesiaUrl(synthesiaUrl)
    if (!src) {
      setError("Paste a Synthesia share URL (e.g. share.synthesia.io/…).")
      return
    }
    onSelect({ kind: "embed", src, title: "Synthesia video" })
  }

  function pickLibrary(video: LibraryVideo) {
    const title =
      video.translations.find((t) => t.locale === "en")?.title ??
      video.translations[0]?.title ??
      video.originalFilename
    onSelect({
      kind: "embed",
      src: `/embed/video/${video.slug}`,
      title,
    })
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? "border-[#EC6E1E] text-[#EC6E1E]"
        : "border-transparent text-gray-500 hover:text-gray-700"
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Insert video</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 border-b border-gray-100">
          <button
            onClick={() => {
              setTab("youtube")
              setError(null)
            }}
            className={tabClass("youtube")}
          >
            YouTube
          </button>
          <button
            onClick={() => {
              setTab("synthesia")
              setError(null)
            }}
            className={tabClass("synthesia")}
          >
            Synthesia
          </button>
          <button
            onClick={() => {
              setTab("library")
              setError(null)
            }}
            className={tabClass("library")}
          >
            Library
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "youtube" && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                YouTube URL
              </label>
              <input
                type="url"
                autoFocus
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitYoutube()}
                placeholder="https://www.youtube.com/watch?v=…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500">
                Paste any YouTube watch or share URL. The video embeds with
                cookie-less privacy mode.
              </p>
            </div>
          )}

          {tab === "synthesia" && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Synthesia share URL
              </label>
              <input
                type="url"
                autoFocus
                value={synthesiaUrl}
                onChange={(e) => setSynthesiaUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitSynthesia()}
                placeholder="https://share.synthesia.io/…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500">
                Paste the &quot;Share&quot; link from Synthesia. We&apos;ll
                rewrite it to the embed URL automatically.
              </p>
            </div>
          )}

          {tab === "library" && (
            <div>
              {libraryLoading && (
                <p className="text-sm text-gray-500 py-8 text-center">
                  Loading videos…
                </p>
              )}
              {libraryError && (
                <p className="text-sm text-red-600 py-2">{libraryError}</p>
              )}
              {!libraryLoading && library && library.length === 0 && (
                <p className="text-sm text-gray-500 py-8 text-center">
                  No ready videos in the library yet. Upload one from the
                  Videos page first.
                </p>
              )}
              {library && library.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {library.map((v) => {
                    const title =
                      v.translations.find((t) => t.locale === "en")?.title ??
                      v.translations[0]?.title ??
                      v.originalFilename
                    return (
                      <button
                        key={v.id}
                        onClick={() => pickLibrary(v)}
                        className="text-left border border-gray-200 rounded-xl overflow-hidden hover:border-[#EC6E1E] hover:shadow-sm transition"
                      >
                        <div className="aspect-video bg-gray-100 flex items-center justify-center">
                          {v.thumbnailPath ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/stream/${v.thumbnailPath}`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-gray-400">
                              No thumbnail
                            </span>
                          )}
                        </div>
                        <div className="px-3 py-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {title}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {v.slug}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {tab === "youtube" && (
            <button
              onClick={submitYoutube}
              className="px-4 py-2 text-sm bg-[#EC6E1E] text-white rounded-lg hover:bg-[#d4601a] transition-colors"
            >
              Insert
            </button>
          )}
          {tab === "synthesia" && (
            <button
              onClick={submitSynthesia}
              className="px-4 py-2 text-sm bg-[#EC6E1E] text-white rounded-lg hover:bg-[#d4601a] transition-colors"
            >
              Insert
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
