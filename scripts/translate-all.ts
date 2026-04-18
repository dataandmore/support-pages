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

// ─── Locale config ───────────────────────────────────────────────────────────

const LOCALE_INSTRUCTIONS: Record<string, string> = {
  da: "Danish (Dansk). Use formal business language (De/Dem not du).",
  sv: "Swedish (Svenska). Use formal business language (ni/er not du).",
  de: "German (Deutsch). Use formal business language (Sie/Ihnen not du).",
}

const TARGET_LOCALES = ["da", "sv", "de"] as const

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Load env vars (Node 20.12+ built-in)
  process.loadEnvFile(".env.local")

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const prisma = new PrismaClient()

  let totalTranslated = 0
  let totalSkipped = 0

  try {
    // Find all EN translations with DRAFT or AI_DRAFT status
    const enTranslations = await prisma.articleTranslation.findMany({
      where: { locale: "en", status: { in: ["DRAFT", "AI_DRAFT"] } },
      include: { article: true },
    })

    const total = enTranslations.length
    console.log(
      `[translate] Found ${total} EN articles to translate into ${TARGET_LOCALES.join(", ")}`
    )

    for (const locale of TARGET_LOCALES) {
      console.log(`\n[translate:${locale}] Starting locale...`)

      for (let i = 0; i < enTranslations.length; i++) {
        const enTranslation = enTranslations[i]
        const articleId = enTranslation.articleId

        try {
          // Check if a translation already exists for this locale
          const existing = await prisma.articleTranslation.findUnique({
            where: { articleId_locale: { articleId, locale } },
          })

          // Skip if exists and is not in a draft state (i.e. IN_REVIEW or PUBLISHED)
          if (
            existing &&
            existing.status !== "DRAFT" &&
            existing.status !== "AI_DRAFT"
          ) {
            console.log(
              `[translate:${locale}] ${i + 1}/${total} SKIP (${existing.status}) ${enTranslation.title}`
            )
            totalSkipped++
            continue
          }

          const plainText = extractText(enTranslation.content)

          const response = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            messages: [
              {
                role: "user",
                content: `Translate this support article to ${LOCALE_INSTRUCTIONS[locale]}.

Return ONLY valid JSON (no markdown fences):
{"title": "...", "content": <tiptap_json_doc>, "excerpt": "..."}

Where content is the full Tiptap ProseMirror JSON document translated to ${locale}.
Translate all text content. Keep HTML structure, URLs, and code blocks unchanged.

Title: ${enTranslation.title}

Content (plain text for context):
${plainText}

Full Tiptap JSON to translate:
${JSON.stringify(enTranslation.content)}
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

          await prisma.articleTranslation.upsert({
            where: { articleId_locale: { articleId: enTranslation.article.id, locale } },
            create: {
              articleId: enTranslation.article.id,
              locale,
              title: parsed.title,
              content: parsed.content as object,
              excerpt: parsed.excerpt,
              status: "AI_DRAFT",
            },
            update: {
              title: parsed.title,
              content: parsed.content as object,
              excerpt: parsed.excerpt,
              status: "AI_DRAFT",
            },
          })

          console.log(
            `[translate:${locale}] ${i + 1}/${total} ${enTranslation.title}`
          )
          totalTranslated++
        } catch (err) {
          console.warn(
            `[translate:${locale}] WARNING: Failed to translate "${enTranslation.title}":`,
            err instanceof Error ? err.message : err
          )
        }

        // Rate limit: 1s between Claude calls
        if (i < enTranslations.length - 1) {
          await new Promise((r) => setTimeout(r, 1000))
        }
      }
    }

    console.log(
      `\n[translate] Done. Translated: ${totalTranslated}, Skipped: ${totalSkipped}.`
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error("[translate] Fatal error:", err)
  process.exit(1)
})
