import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { auth } from "@/lib/auth"

interface ArticleInput {
  id: string
  title: string
  category: string
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { query, articles } = (await req.json()) as {
    query: string
    articles: ArticleInput[]
  }

  if (!query?.trim() || !Array.isArray(articles) || articles.length === 0) {
    return NextResponse.json({ ids: [] })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API key not configured. Add it in Settings → Integrations." },
      { status: 500 },
    )
  }

  try {
    const client = new Anthropic({ apiKey })

    // Build a compact list of articles for Claude to reason over
    const list = articles
      .map((a, i) => `${i + 1}. [${a.id}] ${a.title}${a.category ? ` — ${a.category}` : ""}`)
      .join("\n")

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a semantic search engine for a B2B SaaS support knowledge base.
Given a search query, identify all articles that are relevant — including ones related by meaning, synonyms, or topic, not just exact keyword matches.

Search query: "${query}"

Articles (format: number. [id] title — category):
${list}

Return ONLY a valid JSON array of article IDs that match the query semantically. Be inclusive. Example: ["id1", "id2"]
If nothing matches, return [].
Reply with ONLY the JSON array, no other text.`,
        },
      ],
    })

    const text =
      message.content[0].type === "text" ? message.content[0].text.trim() : "[]"

    // Extract the JSON array safely
    const match = text.match(/\[[\s\S]*\]/)
    let ids: string[] = []
    try {
      ids = match ? (JSON.parse(match[0]) as string[]) : []
    } catch {
      ids = []
    }

    return NextResponse.json({ ids })
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI search failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
