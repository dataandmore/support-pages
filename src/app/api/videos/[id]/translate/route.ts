import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { auth } from "@/lib/auth"

const LOCALE_INSTRUCTIONS: Record<string, string> = {
  da: "Danish (Dansk). Use formal business language.",
  sv: "Swedish (Svenska). Use formal business language.",
  de: "German (Deutsch). Use formal business language (Sie/Ihnen).",
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await params // consume params

  const { title, description, locale } = await req.json() as {
    title: string
    description: string | null
    locale: string
  }

  if (!title || !locale || !LOCALE_INSTRUCTIONS[locale]) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey })
  const descPart = description
    ? `\n\nDescription (translate this too):\n${description}`
    : ""

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Translate the following video title${description ? " and description" : ""} to ${LOCALE_INSTRUCTIONS[locale]}

Keep product names (Data & More, Privacy Platform, DataSubject Manager™, etc.) in English.
Keep technical terms that don't have standard translations.
Return ONLY a JSON object with "title" and "description" keys. No markdown, no explanation.

Title: ${title}${descPart}`,
    }],
  })

  const text = msg.content[0].type === "text" ? msg.content[0].text : ""
  try {
    const parsed = JSON.parse(text.replace(/```json?\n?|\n?```/g, "").trim())
    return NextResponse.json({
      title: parsed.title || title,
      description: parsed.description ?? null,
    })
  } catch {
    return NextResponse.json({ error: "Failed to parse translation" }, { status: 500 })
  }
}
