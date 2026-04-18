"use client"

import { useEffect, useRef, useState } from "react"
import {
  Upload,
  Trash2,
  Copy,
  Check,
  Image as ImageIcon,
  Loader2,
  X,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MediaItem {
  id: string
  filename: string
  originalFilename: string
  mimetype: string
  size: string
  url: string
  createdAt: string
  uploader: { name: string | null; email: string } | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSize(bytes: string): string {
  const n = parseInt(bytes, 10)
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [preview, setPreview] = useState<MediaItem | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadMedia()
  }, [])

  async function loadMedia() {
    setLoading(true)
    try {
      const res = await fetch("/api/media")
      const data = await res.json()
      setMedia(data.media ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function uploadFile(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/media", { method: "POST", body: formData })
      if (res.ok) {
        const data = await res.json()
        setMedia((prev) => [data.media, ...prev])
      } else {
        const err = await res.json()
        alert(err.error ?? "Upload failed")
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  async function handleDelete(item: MediaItem) {
    if (!confirm(`Delete "${item.originalFilename}"?`)) return
    setMedia((prev) => prev.filter((m) => m.id !== item.id))
    if (preview?.id === item.id) setPreview(null)
    await fetch(`/api/media/${item.id}`, { method: "DELETE" })
  }

  async function copyUrl(item: MediaItem) {
    await navigator.clipboard.writeText(window.location.origin + item.url)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Media library</h1>
        <span className="text-sm text-gray-500">
          {media.length} file{media.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors mb-8 ${
          dragOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) uploadFile(file)
          }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-500">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">
              Drop an image here, or click to browse
            </p>
            <p className="text-xs text-gray-400">JPEG, PNG, WebP, GIF, SVG — max 2000px wide</p>
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : media.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ImageIcon className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No images uploaded yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload your first image above</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {media.map((item) => (
            <div
              key={item.id}
              className="group relative bg-gray-100 rounded-xl overflow-hidden aspect-square cursor-pointer"
              onClick={() => setPreview(item)}
            >
              {/* Thumbnail */}
              {item.mimetype.startsWith("image/") ? (
                <img
                  src={item.url}
                  alt={item.originalFilename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                <div className="w-full px-2 py-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); copyUrl(item) }}
                    className="p-1.5 bg-white rounded-lg text-gray-700 hover:bg-gray-100"
                    title="Copy URL"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item) }}
                    className="p-1.5 bg-white rounded-lg text-red-600 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview lightbox */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="bg-gray-100 flex items-center justify-center max-h-80 overflow-hidden">
              <img
                src={preview.url}
                alt={preview.originalFilename}
                className="max-h-80 object-contain"
              />
            </div>

            {/* Details */}
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900 text-sm break-all">
                    {preview.originalFilename}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatSize(preview.size)} · {formatDate(preview.createdAt)}
                    {preview.uploader && ` · ${preview.uploader.name ?? preview.uploader.email}`}
                  </p>
                </div>
                <button
                  onClick={() => setPreview(null)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* URL copy row */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <code className="text-xs text-gray-600 flex-1 truncate">{preview.url}</code>
                <button
                  onClick={() => copyUrl(preview)}
                  className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium shrink-0"
                >
                  {copiedId === preview.id ? (
                    <><Check className="w-3.5 h-3.5" /> Copied!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copy URL</>
                  )}
                </button>
              </div>

              {/* Delete */}
              <div className="flex justify-end mt-3">
                <button
                  onClick={() => handleDelete(preview)}
                  className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" /> Delete image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
