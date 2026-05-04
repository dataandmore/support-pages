import { NextResponse } from "next/server"

export async function GET() {
  const config = {
    mcpServers: {
      "dam-support": {
        command: "npx",
        args: ["-y", "dam-support-mcp"],
      },
    },
  }

  return new NextResponse(JSON.stringify(config, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="claude_desktop_config.json"',
    },
  })
}
