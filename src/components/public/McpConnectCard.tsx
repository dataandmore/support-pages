"use client"

import { useState } from "react"

const MCP_CONFIG = JSON.stringify(
  {
    mcpServers: {
      "dam-support": {
        command: "node",
        args: ["./mcp-server/dist/index.js"],
        env: { DAM_SUPPORT_URL: "https://cs.dataandmore.com" },
      },
    },
  },
  null,
  2
)

const GITHUB_URL = "https://github.com/djunge/dam-support-portal/tree/main/mcp-server"

export function McpConnectCard() {
  const [showConfig, setShowConfig] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(MCP_CONFIG)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 pb-6">
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-gray-50/50 transition-colors"
        >
          {/* Claude logo */}
          <div className="w-10 h-10 rounded-xl bg-[#2A2A2C] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#EC6E1E]" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#2A2A2C]">
              Connect to Claude
            </p>
            <p className="text-xs text-gray-500">
              Use our knowledge base as an MCP tool in Claude Desktop, Claude Code, or any MCP client
            </p>
          </div>
          <span className="text-gray-400 text-lg shrink-0">
            {showConfig ? "−" : "+"}
          </span>
        </button>

        {/* Expandable config section */}
        {showConfig && (
          <div className="border-t border-gray-100 px-6 py-5 space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                1. Clone and build the MCP server
              </p>
              <div className="bg-gray-900 rounded-lg p-3 text-xs font-mono text-gray-300 overflow-x-auto">
                <span className="text-gray-500">$</span> git clone https://github.com/djunge/dam-support-portal.git<br />
                <span className="text-gray-500">$</span> cd dam-support-portal/mcp-server<br />
                <span className="text-gray-500">$</span> npm install && npm run build
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">
                  2. Add to your Claude config
                </p>
                <button
                  onClick={handleCopy}
                  className="text-[10px] font-medium text-[#EC6E1E] hover:underline"
                >
                  {copied ? "Copied!" : "Copy JSON"}
                </button>
              </div>
              <pre className="bg-gray-900 rounded-lg p-3 text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre">
                {MCP_CONFIG}
              </pre>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#EC6E1E] font-medium hover:underline"
              >
                View on GitHub &rarr;
              </a>
              <span className="text-gray-300">|</span>
              <p className="text-xs text-gray-400">
                5 tools: search, list-categories, list-articles, get-article, list-videos
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
