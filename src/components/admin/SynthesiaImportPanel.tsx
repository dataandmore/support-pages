"use client"

import { useState } from "react"
import { Download, RefreshCw, CheckSquare, Square, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import type { SynthesiaVideo } from "@/app/api/admin/synthesia/videos/route"

type ImportResult = {
  title: string
  status: "imported" | "skipped" | "error"
  reason?: string
}

function formatDuration(s: number | null) {
  if (!s) return ""
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return ` · ${m}:${String(sec).padStart(2, "0")}`
}

export function SynthesiaImportPanel() {
  const [videos, setVideos]           = useState<SynthesiaVideo[] | null>(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [importing, setImporting]     = useState(false)
  const [results, setResults]         = useState<ImportResult[] | null>(null)

  async function fetchVideos() {
    setLoading(true)
    setError(null)
    setResults(null)
    setSelected(new Set())
    try {
      const res = await fetch("/api/admin/synthesia/videos")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch videos")
      const complete = (data.videos as SynthesiaVideo[]).filter((v) => v.status === "complete" && v.download)
      setVideos(complete)
      // Pre-select all by default
      setSelected(new Set(complete.map((v) => v.id)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  function toggleAll() {
    if (!videos) return
    if (selected.size === videos.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(videos.map((v) => v.id)))
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleImport() {
    if (!videos || selected.size === 0) return
    setImporting(true)
    setResults(null)
    try {
      const toImport = videos
        .filter((v) => selected.has(v.id))
        .map((v) => ({ id: v.id, title: v.title, download: v.download!, thumbnail: v.thumbnail, duration: v.duration }))

      const res = await fetch("/api/admin/synthesia/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos: toImport }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Import failed")
      setResults(data.results as ImportResult[])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed")
    } finally {
      setImporting(false)
    }
  }

  const allSelected = videos && selected.size === videos.length
  const queued  = results?.filter((r) => r.status === "imported").length ?? 0
  const skipped = results?.filter((r) => r.status === "skipped").length ?? 0
  const failed  = results?.filter((r) => r.status === "error").length ?? 0

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Import from Synthesia</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Embed videos from your Synthesia workspace into the video library.
          </p>
        </div>
        <button
          onClick={fetchVideos}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {videos === null ? "Fetch from Synthesia" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Results summary */}
      {results && (
        <div className="mb-4 flex flex-wrap gap-3">
          {queued > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" />
              {queued} imported
            </span>
          )}
          {skipped > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full">
              {skipped} already imported
            </span>
          )}
          {failed > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
              <XCircle className="w-3.5 h-3.5" />
              {failed} failed
            </span>
          )}
          <p className="text-xs text-gray-400 self-center">
            Videos are embedded directly from Synthesia — no transcoding needed.
          </p>
        </div>
      )}

      {/* Video list */}
      {videos !== null && (
        <>
          {videos.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No completed videos found in your Synthesia workspace.
            </p>
          ) : (
            <>
              {/* Select all + import button */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#EC6E1E]" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || selected.size === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-[#EC6E1E] text-white text-sm font-medium rounded-lg hover:bg-[#d4601a] disabled:opacity-50 transition-colors"
                >
                  {importing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {importing ? "Importing…" : `Import ${selected.size} video${selected.size !== 1 ? "s" : ""}`}
                </button>
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                {videos.map((video) => {
                  const result = results?.find((r) => r.title === video.title)
                  return (
                    <label
                      key={video.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(video.id)}
                        onChange={() => toggle(video.id)}
                        className="w-4 h-4 accent-[#EC6E1E]"
                      />
                      {video.thumbnail && (
                        <img
                          src={video.thumbnail}
                          alt=""
                          className="w-14 h-9 object-cover rounded-lg bg-gray-100 shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{video.title}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(video.created_at * 1000).toLocaleDateString()}
                          {formatDuration(video.duration)}
                        </p>
                      </div>
                      {result && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                          result.status === "imported"
                            ? "bg-emerald-50 text-emerald-700"
                            : result.status === "skipped"
                              ? "bg-gray-100 text-gray-500"
                              : "bg-red-50 text-red-600"
                        }`}>
                          {result.status === "imported" ? "Imported" : result.status === "skipped" ? "Already imported" : `Error: ${result.reason}`}
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
