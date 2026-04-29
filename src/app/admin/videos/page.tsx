"use client"

import { useEffect, useRef, useState } from "react"
import {
  Upload,
  Trash2,
  Edit2,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Languages,
  Lock,
  Unlock,
  Pin,
  Play,
  X,
} from "lucide-react"
import { SynthesiaImportPanel } from "@/components/admin/SynthesiaImportPanel"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VideoStatus = "UPLOADING" | "PROCESSING" | "READY" | "ERROR"
type Locale = "en" | "da" | "sv" | "de"

interface VideoTranslation {
  locale: Locale
  title: string
  description: string | null
}

interface Video {
  id: string
  slug: string
  originalFilename: string
  size: string
  duration: number | null
  status: VideoStatus
  thumbnailPath: string | null
  hlsPath: string | null
  synthesiaId: string | null
  thumbnailUrl: string | null
  isGated: boolean
  pinned: boolean
  createdAt: string
  translations: VideoTranslation[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOCALES: Locale[] = ["en", "da", "sv", "de"]
const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  da: "DA",
  sv: "SV",
  de: "DE",
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

function formatSize(bytes: string): string {
  const n = parseInt(bytes, 10)
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const statusConfig: Record<
  VideoStatus,
  { label: string; classes: string; spinning?: boolean }
> = {
  UPLOADING: { label: "Uploading", classes: "bg-gray-100 text-gray-600", spinning: true },
  PROCESSING: { label: "Processing", classes: "bg-yellow-100 text-yellow-700", spinning: true },
  READY: { label: "Ready", classes: "bg-green-100 text-green-700" },
  ERROR: { label: "Error", classes: "bg-red-100 text-red-700" },
}

// ---------------------------------------------------------------------------
// EditModal
// ---------------------------------------------------------------------------

interface EditModalProps {
  video: Video
  onClose: () => void
  onSaved: (video: Video) => void
}

function EditModal({ video, onClose, onSaved }: EditModalProps) {
  const [activeLocale, setActiveLocale] = useState<Locale>("en")
  const [isGated, setIsGated] = useState(video.isGated)
  const [pinned, setPinned] = useState(video.pinned)
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)

  const [translations, setTranslations] = useState<
    Record<Locale, { title: string; description: string }>
  >(() => {
    const map: Record<Locale, { title: string; description: string }> = {
      en: { title: "", description: "" },
      da: { title: "", description: "" },
      sv: { title: "", description: "" },
      de: { title: "", description: "" },
    }
    for (const t of video.translations) {
      map[t.locale] = { title: t.title, description: t.description ?? "" }
    }
    return map
  })

  function updateField(locale: Locale, field: "title" | "description", value: string) {
    setTranslations((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [field]: value },
    }))
  }

  async function handleTranslate() {
    if (activeLocale === "en") return
    const en = translations.en
    if (!en.title.trim()) return
    setTranslating(true)
    try {
      const res = await fetch(`/api/videos/${video.id}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: en.title,
          description: en.description || null,
          locale: activeLocale,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setTranslations((prev) => ({
          ...prev,
          [activeLocale]: {
            title: data.title ?? prev[activeLocale].title,
            description: data.description ?? prev[activeLocale].description,
          },
        }))
      }
    } finally {
      setTranslating(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Save each locale that has a non-empty title.
      for (const locale of LOCALES) {
        const t = translations[locale]
        if (!t.title.trim()) continue
        await fetch(`/api/videos/${video.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            title: t.title,
            description: t.description || null,
          }),
        })
      }
      // Update isGated + pinned separately.
      const res = await fetch(`/api/videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isGated, pinned }),
      })
      const data = await res.json()
      if (data.video) onSaved(data.video)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Edit video</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Locale tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {LOCALES.map((loc) => (
            <button
              key={loc}
              onClick={() => setActiveLocale(loc)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeLocale === loc
                  ? "bg-[#EC6E1E] text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {LOCALE_LABELS[loc]}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={translations[activeLocale].title}
              onChange={(e) => updateField(activeLocale, "title", e.target.value)}
              placeholder={`Title in ${LOCALE_LABELS[activeLocale]}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={translations[activeLocale].description}
              onChange={(e) => updateField(activeLocale, "description", e.target.value)}
              placeholder={`Description in ${LOCALE_LABELS[activeLocale]}`}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          {/* isGated toggle */}
          <div className="flex items-center gap-3 pt-1">
            <button
              role="switch"
              aria-checked={isGated}
              onClick={() => setIsGated((v) => !v)}
              className={`relative w-10 h-6 rounded-full transition-colors ${
                isGated ? "bg-[#EC6E1E]" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  isGated ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm text-gray-700 flex items-center gap-1.5">
              {isGated ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> Gated (login required)
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Public
                </>
              )}
            </span>
          </div>

          {/* Pinned toggle */}
          <div className="flex items-center gap-3 pt-1">
            <button
              role="switch"
              aria-checked={pinned}
              onClick={() => setPinned((v) => !v)}
              className={`relative w-10 h-6 rounded-full transition-colors ${
                pinned ? "bg-[#EC6E1E]" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  pinned ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm text-gray-700 flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5" />
              {pinned ? "Pinned to dashboard & videos page" : "Not pinned"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-[#EC6E1E] text-white rounded-lg hover:bg-[#d4601a] transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [regenStatus, setRegenStatus] = useState<"idle" | "running" | "done" | "error">("idle")
  const [regenMessage, setRegenMessage] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === videos.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(videos.map((v) => v.id)))
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} video${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`)) return
    setBulkDeleting(true)
    for (const id of selectedIds) {
      const interval = pollingIntervals.current.get(id)
      if (interval) {
        clearInterval(interval)
        pollingIntervals.current.delete(id)
      }
      await fetch(`/api/videos/${id}`, { method: "DELETE" })
    }
    setVideos((prev) => prev.filter((v) => !selectedIds.has(v.id)))
    setSelectedIds(new Set())
    setBulkDeleting(false)
  }
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  useEffect(() => {
    loadVideos()
    return () => {
      pollingIntervals.current.forEach((interval) => clearInterval(interval))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadVideos() {
    setLoading(true)
    try {
      const res = await fetch("/api/videos")
      const data = await res.json()
      const list: Video[] = data.videos ?? []
      setVideos(list)
      // Resume polling for any in-flight videos.
      list.forEach((v) => {
        if (v.status === "UPLOADING" || v.status === "PROCESSING") {
          startPolling(v.id)
        }
      })
    } finally {
      setLoading(false)
    }
  }

  function startPolling(videoId: string) {
    if (pollingIntervals.current.has(videoId)) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/videos/${videoId}/status`)
        const status = await res.json()
        setVideos((prev) =>
          prev.map((v) =>
            v.id === videoId
              ? {
                  ...v,
                  status: status.status,
                  duration: status.duration ?? v.duration,
                  thumbnailPath: status.thumbnailPath ?? v.thumbnailPath,
                  hlsPath: status.hlsPath ?? v.hlsPath,
                }
              : v
          )
        )
        if (status.status === "READY" || status.status === "ERROR") {
          clearInterval(interval)
          pollingIntervals.current.delete(videoId)
        }
      } catch {
        // Network error — keep polling.
      }
    }, 3000)
    pollingIntervals.current.set(videoId, interval)
  }

  function handleFileSelect(file: File) {
    if (!file.type.startsWith("video/")) {
      alert("Please select a video file.")
      return
    }
    setSelectedFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  function handleUpload() {
    if (!selectedFile) return
    const formData = new FormData()
    formData.append("file", selectedFile)
    setUploading(true)
    setUploadProgress(0)

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status === 202) {
        const data = JSON.parse(xhr.responseText)
        const video: Video = data.video
        setVideos((prev) => [video, ...prev])
        startPolling(video.id)
        setSelectedFile(null)
        setUploadProgress(0)
        if (fileInputRef.current) fileInputRef.current.value = ""
      } else {
        alert("Upload failed. Please try again.")
      }
      setUploading(false)
    })

    xhr.addEventListener("error", () => {
      alert("Upload error. Please try again.")
      setUploading(false)
    })

    xhr.open("POST", "/api/videos")
    xhr.send(formData)
  }

  async function handleDelete(videoId: string) {
    if (!confirm("Delete this video? This cannot be undone.")) return
    const interval = pollingIntervals.current.get(videoId)
    if (interval) {
      clearInterval(interval)
      pollingIntervals.current.delete(videoId)
    }
    setVideos((prev) => prev.filter((v) => v.id !== videoId))
    await fetch(`/api/videos/${videoId}`, { method: "DELETE" })
  }

  async function handleRegenThumbnails() {
    setRegenStatus("running")
    setRegenMessage("")
    try {
      const res = await fetch("/api/admin/synthesia/thumbnails", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setRegenStatus("error")
        setRegenMessage(data.error ?? "Failed")
        return
      }
      const { summary } = data
      setRegenStatus("done")
      setRegenMessage(
        `${summary.downloaded} downloaded, ${summary.skipped} already existed, ${summary.notFound} not found in Synthesia`
      )
      // Reload to refresh thumbnails
      loadVideos()
    } catch {
      setRegenStatus("error")
      setRegenMessage("Network error")
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Videos</h1>
        <span className="text-sm text-gray-500">
          {videos.length} video{videos.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Synthesia import */}
      <SynthesiaImportPanel />

      {/* Regenerate thumbnails */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleRegenThumbnails}
          disabled={regenStatus === "running"}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {regenStatus === "running" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Fetching thumbnails…
            </>
          ) : (
            "Regenerate thumbnails"
          )}
        </button>
        {regenMessage && (
          <span className={`text-xs ${regenStatus === "error" ? "text-red-600" : "text-gray-500"}`}>
            {regenMessage}
          </span>
        )}
      </div>

      {/* Upload zone */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Upload new video</h2>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-[#EC6E1E] bg-orange-50"
              : selectedFile
              ? "border-green-400 bg-green-50"
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />
          {selectedFile ? (
            <div className="space-y-1">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
              <p className="text-sm font-medium text-green-700">{selectedFile.name}</p>
              <p className="text-xs text-green-600">{formatSize(String(selectedFile.size))}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-sm font-medium text-gray-600">
                Drop a video file here, or click to browse
              </p>
              <p className="text-xs text-gray-400">MP4, MOV, WebM, MKV…</p>
            </div>
          )}
        </div>

        {/* Upload progress bar */}
        {uploading && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Uploading…</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#EC6E1E] h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {selectedFile && !uploading && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleUpload}
              className="flex items-center gap-2 px-4 py-2 bg-[#EC6E1E] text-white text-sm font-medium rounded-lg hover:bg-[#d4601a] transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload &amp; transcode
            </button>
            <button
              onClick={() => {
                setSelectedFile(null)
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Video table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Play className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No videos yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload your first video above</p>
          </div>
        ) : (
          <>
            {/* Bulk actions bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-orange-50 border-b border-orange-100 rounded-t-2xl">
                <span className="text-sm font-medium text-[#EC6E1E]">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {bulkDeleting ? "Deleting…" : "Delete selected"}
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Clear selection
                </button>
              </div>
            )}
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={videos.length > 0 && selectedIds.size === videos.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-[#EC6E1E] focus:ring-[#EC6E1E] cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">Preview</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Duration</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Size</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Access</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {videos.map((video) => {
                const enTrans = video.translations.find((t) => t.locale === "en")
                const firstTrans = video.translations[0]
                const displayTitle = enTrans?.title ?? firstTrans?.title ?? video.originalFilename
                const titleLocale = enTrans ? null : firstTrans?.locale ?? null
                const cfg = statusConfig[video.status]
                return (
                  <tr key={video.id} className={`transition-colors ${selectedIds.has(video.id) ? "bg-orange-50/50" : "hover:bg-gray-50"}`}>
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(video.id)}
                        onChange={() => toggleSelect(video.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#EC6E1E] focus:ring-[#EC6E1E] cursor-pointer"
                      />
                    </td>
                    {/* Thumbnail */}
                    <td className="px-4 py-3">
                      {(() => {
                        const thumbSrc = video.thumbnailUrl
                          ?? (video.thumbnailPath ? `/api/stream/${video.thumbnailPath}` : null)
                        if (thumbSrc) {
                          return (
                            <img
                              src={thumbSrc}
                              alt=""
                              className="w-16 h-10 object-cover rounded-lg bg-gray-100"
                              onError={(e) => {
                                e.currentTarget.style.display = "none"
                              }}
                            />
                          )
                        }
                        return (
                          <div className="w-16 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            {video.synthesiaId ? (
                              <span className="text-[8px] font-medium text-gray-400">S</span>
                            ) : (
                              <Play className="w-4 h-4 text-gray-300" />
                            )}
                          </div>
                        )
                      })()}
                    </td>

                    {/* Title + filename */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-xs flex items-center gap-1.5">
                        {video.pinned && (
                          <Pin className="w-3.5 h-3.5 text-[#EC6E1E] shrink-0" />
                        )}
                        {displayTitle}
                        {titleLocale && (
                          <span className="shrink-0 text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">
                            {titleLocale}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">
                        {video.originalFilename}
                      </p>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.classes}`}
                      >
                        {cfg.spinning ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : video.status === "READY" ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {cfg.label}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-3 text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {formatDuration(video.duration)}
                      </span>
                    </td>

                    {/* Size */}
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatSize(video.size)}
                    </td>

                    {/* Access */}
                    <td className="px-4 py-3">
                      {video.isGated ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                          <Lock className="w-3.5 h-3.5" /> Gated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <Unlock className="w-3.5 h-3.5" /> Public
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingVideo(video)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                          title="Edit metadata"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(video.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete video"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </>
        )}
      </div>

      {/* Edit modal */}
      {editingVideo && (
        <EditModal
          video={editingVideo}
          onClose={() => setEditingVideo(null)}
          onSaved={(updated) => {
            setVideos((prev) =>
              prev.map((v) => (v.id === updated.id ? { ...v, ...updated } : v))
            )
            setEditingVideo(null)
          }}
        />
      )}
    </div>
  )
}
