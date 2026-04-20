"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"

interface QuickLoginModalProps {
  onClose: () => void
  /** Where to navigate after successful login */
  callbackUrl: string
}

export function QuickLoginModal({ onClose, callbackUrl }: QuickLoginModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await signIn("credentials", { email, password, redirect: false })
    if (result?.error) {
      setError("Invalid email or password")
      setLoading(false)
    } else {
      // Hard-navigate so the admin page loads with the fresh session
      window.location.href = callbackUrl
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 mx-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#2A2A2C]">Sign in to edit</h2>
            <p className="text-xs text-gray-400 mt-0.5">You'll be taken directly to the editor</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 text-2xl font-light leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="ql-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="ql-email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC6E1E] focus:border-[#EC6E1E] transition-colors"
            />
          </div>

          <div>
            <label htmlFor="ql-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="ql-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC6E1E] focus:border-[#EC6E1E] transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#EC6E1E] hover:bg-[#d4601a] disabled:bg-orange-300 text-white font-semibold py-2.5 rounded-lg transition-colors mt-2"
          >
            {loading ? "Signing in…" : "Sign in & Edit"}
          </button>
        </form>
      </div>
    </div>
  )
}
