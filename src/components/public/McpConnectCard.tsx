"use client"

import { useState } from "react"

const MCP_URL = "https://support.dataandmore.com/api/mcp"

const MCP_CONFIG = JSON.stringify(
  {
    mcpServers: {
      "dam-support": {
        url: MCP_URL,
      },
    },
  },
  null,
  2
)

export function McpConnectCard() {
  const [showConfig, setShowConfig] = useState(false)
  const [copied, setCopied] = useState<"url" | "config" | null>(null)

  function copy(text: string, which: "url" | "config") {
    navigator.clipboard.writeText(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 pb-6">
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-gray-50/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-[#2A2A2C] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#EC6E1E]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
              <polyline points="7.5 19.79 7.5 14.6 3 12" />
              <polyline points="21 12 16.5 14.6 16.5 19.79" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#2A2A2C]">
              Connect to Claude
            </p>
            <p className="text-xs text-gray-500">
              Search our knowledge base directly from Claude Desktop or Claude Code
            </p>
          </div>
          <span className="text-gray-400 text-lg shrink-0">
            {showConfig ? "−" : "+"}
          </span>
        </button>

        {showConfig && (
          <div className="border-t border-gray-100 px-6 py-5 space-y-4">
            {/* URL copy */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                MCP Server URL
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-xs font-mono text-[#2A2A2C] truncate">
                  {MCP_URL}
                </code>
                <button
                  onClick={() => copy(MCP_URL, "url")}
                  className="shrink-0 px-3 py-2 rounded-lg bg-[#EC6E1E] text-white text-xs font-medium hover:bg-[#d4601a] transition-colors"
                >
                  {copied === "url" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-xs text-gray-600 leading-relaxed space-y-1.5">
              <p><strong>Claude Desktop:</strong> Settings &rarr; Developer &rarr; Edit Config &rarr; paste the config below</p>
              <p><strong>Claude Code:</strong> Add to <span className="font-mono text-[11px]">~/.claude/.mcp.json</span></p>
            </div>

            {/* Config JSON */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">
                  Configuration
                </p>
                <button
                  onClick={() => copy(MCP_CONFIG, "config")}
                  className="text-[10px] font-medium text-[#EC6E1E] hover:underline"
                >
                  {copied === "config" ? "Copied!" : "Copy JSON"}
                </button>
              </div>
              <pre className="bg-gray-900 rounded-lg p-3 text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre">
                {MCP_CONFIG}
              </pre>
            </div>

            <p className="text-xs text-gray-400 pt-1">
              5 tools: search, categories, articles, get-article, videos &middot; Supports EN, DA, SV, DE
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
