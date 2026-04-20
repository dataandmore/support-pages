import Anthropic from "@anthropic-ai/sdk"
import { PrismaClient } from "@prisma/client"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractText(content: unknown): string {
  if (!content || typeof content !== "object") return ""
  const doc = content as { type?: string; content?: unknown[]; text?: string }
  if (doc.type === "text") return doc.text ?? ""
  if (!doc.content) return ""
  return doc.content.map(extractText).join(" ")
}

function parseJsonResponse(text: string): unknown {
  // Strip markdown code fences
  const stripped = text
    .replace(/^```(?:json)?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim()
  try {
    return JSON.parse(stripped)
  } catch {
    // Try to find JSON object in the text
    const match = stripped.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error("Could not parse JSON response")
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Load env vars (Node 20.12+ built-in)
  process.loadEnvFile(".env.local")

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const prisma = new PrismaClient()

  try {
    // Find all EN translations with DRAFT status
    const articles = await prisma.articleTranslation.findMany({
      where: { locale: "en", status: "DRAFT" },
      include: { article: true },
    })

    const total = articles.length
    console.log(`[rewrite] Found ${total} DRAFT EN articles to rewrite`)

    for (let i = 0; i < articles.length; i++) {
      const translation = articles[i]

      try {
        const text = extractText(translation.content)

        const response = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: `You are rewriting a support article for Data and More, a B2B SaaS company.

Rewrite this article to be:
1. Clearer and more professional
2. Better structured with proper headings and sections
3. Fact-checked and accurate for a software support context
4. Written in formal B2B English
5. Add <!-- ILLUSTRATION: [description] --> comments where diagrams or screenshots would help

Return ONLY valid JSON (no markdown fences) in this exact format:
{"title": "...", "content": <tiptap_json_doc>, "excerpt": "..."}

Where content is a valid Tiptap ProseMirror JSON document object.

Original title: ${translation.title}

Original content (as plain text):
${text}
`,
            },
          ],
        })

        const rawText =
          response.content[0].type === "text" ? response.content[0].text : ""

        const parsed = parseJsonResponse(rawText) as {
          title: string
          content: unknown
          excerpt: string
        }

        await prisma.articleTranslation.update({
          where: { id: translation.id },
          data: {
            title: parsed.title,
            content: parsed.content as object,
            excerpt: parsed.excerpt,
            status: "AI_DRAFT",
          },
        })

        console.log(`[rewrite] ${i + 1}/${total} ${translation.title}`)
      } catch (err) {
        console.warn(
          `[rewrite] WARNING: Failed to rewrite "${translation.title}":`,
          err instanceof Error ? err.message : err
        )
      }

      // Rate limit: 1s between Claude calls
      if (i < articles.length - 1) {
        await new Promise((r) => setTimeout(r, 1000))
      }
    }

    console.log(`[rewrite] Done. Rewrote ${total} articles.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error("[rewrite] Fatal error:", err)
  process.exit(1)
})
