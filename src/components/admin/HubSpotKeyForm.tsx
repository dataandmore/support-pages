"use client"

import { useState } from "react"
import { Eye, EyeOff, ExternalLink, CheckCircle, RotateCcw } from "lucide-react"

interface HubSpotKeyFormProps {
  isConfigured: boolean
}

export function HubSpotKeyForm({ isConfigured }: HubSpotKeyFormProps) {
  const [value, setValue]     = useState("")
  const [show, setShow]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "HUBSPOT_API_KEY", value }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? "Failed to save")
      }
      setSaved(true)
      setValue("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-2xl p-6 bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900">HubSpot API Key</span>
            {isConfigured && !saved && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> Configured
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Used for reading HubSpot Knowledge Base articles and archiving content.
          </p>
          <code className="text-xs text-gray-400 font-mono">HUBSPOT_API_KEY</code>
        </div>
        <a
          href="https://app.hubspot.com/private-apps"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-[#EC6E1E] hover:underline shrink-0 ml-4"
        >
          Get key from HubSpot
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-3">
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => { setValue(e.target.value); setSaved(false) }}
            placeholder={isConfigured ? "Paste new key to replace…" : "Paste your HubSpot Private App token…"}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#EC6E1E]/30 focus:border-[#EC6E1E]"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {saved && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            Saved to <code className="font-mono">.env.local</code>.
            Restart the dev server (<code className="font-mono">npm run dev</code>) to apply.
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !value.trim()}
          className="bg-[#EC6E1E] hover:bg-[#d4601a] disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? "Saving…" : "Save API key"}
        </button>
      </form>
    </div>
  )
}
