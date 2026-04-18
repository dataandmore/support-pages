"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Upload, X, Loader2, Image as ImageIcon, Check } from "lucide-react"

interface MediaItem {
  id: string
  filename: string
  originalFilename: string
  mimetype: string
  url: string
  size: string
}

interface MediaPickerProps {
  /** Called with the chosen image URL when the user selects an image. */
  onSelect: (url: string) => void
  /** Called when the user dismisses the picker without selecting. */
  onClose: () => void
}

export function MediaPicker({ onSelect, onClose }: MediaPickerProps) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Close on Escape key.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

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

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/media", { method: "POST", body: formData })
      if (res.ok) {
        const data = await res.json()
        setMedia((prev) => [data.media, ...prev])
        setSelectedId(data.media.id)
      } else {
        const err = await res.json()
        alert(err.error ?? "Upload failed")
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function handleInsert() {
    const item = media.find((m) => m.id === selectedId)
    if (item) onSelect(item.url)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-semibold text-gray-900">Media library</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload strip */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="mx-6 mt-4 mb-2 border border-dashed border-gray-300 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors shrink-0"
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
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 shrink-0" />
          ) : (
            <Upload className="w-6 h-6 text-gray-400 shrink-0" />
          )}
          <p className="text-sm text-gray-500">
            {uploading ? "Uploading…" : "Drop an image or click to upload"}
          </p>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : media.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImageIcon className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No images yet — upload one above</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-2">
              {media.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                  className={`relative aspect-square rounded-lg overflow-hidden bg-gray-100 ring-2 transition-all ${
                    selectedId === item.id
                      ? "ring-blue-500"
                      : "ring-transparent hover:ring-gray-300"
                  }`}
                >
                  <img
                    src={item.url}
                    alt={item.originalFilename}
                    className="w-full h-full object-cover"
                  />
                  {selectedId === item.id && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                  {/* Filename tooltip on hover */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1.5 py-1 truncate opacity-0 hover:opacity-100 transition-opacity">
                    {item.originalFilename}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0">
          <p className="text-xs text-gray-400">
            {selectedId
              ? media.find((m) => m.id === selectedId)?.originalFilename
              : "Select an image to insert"}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInsert}
              disabled={!selectedId}
              className="px-4 py-2 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-40"
            >
              Insert image
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
