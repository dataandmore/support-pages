import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

const ENV_PATH = join(process.cwd(), ".env.local")

/** Allowed keys that can be updated via the admin UI */
const ALLOWED_KEYS = new Set(["HUBSPOT_API_KEY", "ANTHROPIC_API_KEY", "SYNTHESIA_API_KEY"])

function readEnvFile(): string {
  if (!existsSync(ENV_PATH)) return ""
  return readFileSync(ENV_PATH, "utf-8")
}

function writeEnvKey(key: string, value: string): void {
  let content = readEnvFile()
  const regex = new RegExp(`^${key}=.*$`, "m")
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`)
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`
  }
  writeFileSync(ENV_PATH, content, "utf-8")
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { key, value } = await req.json()

  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: "Key not allowed" }, { status: 400 })
  }
  if (typeof value !== "string" || value.trim() === "") {
    return NextResponse.json({ error: "Value required" }, { status: 400 })
  }

  const trimmed = value.trim()

  try {
    writeEnvKey(key, trimmed)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to write .env.local"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // Apply immediately so the key works without a restart
  process.env[key] = trimmed

  return NextResponse.json({ success: true })
}
