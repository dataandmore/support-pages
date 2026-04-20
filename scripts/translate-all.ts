import Anthropic from "@anthropic-ai/sdk"
import fs from "fs"
import path from "path"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

// ─── Env loader ───────────────────────────────────────────────────────────────
// process.loadEnvFile / dotenv.config both skip vars that are already set in
// process.env. The Claude Code harness pre-injects ANTHROPIC_API_KEY="" (empty),
// so we read .env.local directly and extract the key, bypassing that override.
function readEnvFile(filePath: string): Record<string, string> {
  try {
    const lines = fs.readFileSync(filePath, "utf-8").split("\n")
    const vars: Record<string, string> = {}
    for (const line of lines) {
      const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
      if (m) vars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "")
    }
    return vars
  } catch {
    return {}
  }
}

// ─── Text extraction / injection ──────────────────────────────────────────────
// Instead of asking Claude to reproduce the full Tiptap JSON (which can produce
// invalid JSON for large articles), we extract all text strings, translate just
// those, and merge them back into the original structure.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectTexts(node: any, out: string[]): void {
  if (!node || typeof node !== "object") return
  if (node.type === "text") {
    out.push(node.text ?? "")
    return
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) collectTexts(child, out)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyTexts(node: any, texts: string[], idx: { i: number }): any {
  if (!node || typeof node !== "object") return node
  if (node.type === "text") {
    return { ...node, text: texts[idx.i++] ?? node.text }
  }
  if (Array.isArray(node.content)) {
    return { ...node, content: node.content.map((child: unknown) => applyTexts(child, texts, idx)) }
  }
  return node
}

// ─── Locale config ───────────────────────────────────────────────────────────

const LOCALE_INSTRUCTIONS: Record<string, string> = {
  da: "Danish (Dansk). Use formal business language (De/Dem not du).",
  sv: "Swedish (Svenska). Use formal business language (ni/er not du).",
  de: "German (Deutsch). Use formal business language (Sie/Ihnen not du).",
}

const TARGET_LOCALES = ["da", "sv", "de"] as const

// ─── CLI flags ────────────────────────────────────────────────────────────────

// --force: re-translate even PUBLISHED translations (use after fixing bad translations)
const FORCE = process.argv.includes("--force")
// --retry-failed: only re-translate articles where DA/SV/DE title matches EN (failed translation)
const RETRY_FAILED = process.argv.includes("--retry-failed")
// --locale=da,sv,de: only process specific locales (comma-separated)
const LOCALE_ARG = process.argv.find((a) => a.startsWith("--locale="))
const ONLY_LOCALES = LOCALE_ARG ? LOCALE_ARG.replace("--locale=", "").split(",") : null

// ─── Main ─────────────────────────────────────────────────────────────────────

async function callWithRetry(
  fn: () => Promise<Anthropic.Message>,
  label: string
): Promise<Anthropic.Message> {
  let lastErr: Error | undefined
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
      const isOverloaded =
        lastErr.message.includes("overloaded") ||
        lastErr.message.includes("529") ||
        lastErr.message.includes("rate")
      if (isOverloaded && attempt < 2) {
        const delay = (attempt + 1) * 15000 // 15s, 30s
        console.warn(`${label} Overloaded, retrying in ${delay / 1000}s…`)
        await new Promise((r) => setTimeout(r, delay))
      } else {
        throw lastErr
      }
    }
  }
  throw lastErr ?? new Error("No response after retries")
}

async function main() {
  // Read .env.local directly so harness-injected empty vars don't win
  const env = readEnvFile(path.join(process.cwd(), ".env.local"))
  const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
  const connectionString = env.DATABASE_URL || process.env.DATABASE_URL

  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set in .env.local")

  const client = new Anthropic({ apiKey })
  if (!connectionString) throw new Error("DATABASE_URL not set in .env.local")
  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })

  if (FORCE) {
    console.log("[translate] --force mode: will re-translate ALL locales including PUBLISHED")
  }
  if (ONLY_LOCALES) {
    console.log(`[translate] --locale filter: ${ONLY_LOCALES.join(", ")}`)
  }

  let totalTranslated = 0
  let totalSkipped = 0

  try {
    // Find all EN translations (any status) — we'll skip locales that are
    // already fully translated (non-draft), but we need the full list to
    // catch articles that are missing a locale translation entirely.
    const enTranslations = await prisma.articleTranslation.findMany({
      where: { locale: "en" },
      include: { article: true },
    })

    const total = enTranslations.length
    console.log(
      `[translate] Found ${total} EN articles to translate into ${TARGET_LOCALES.join(", ")}`
    )

    const localesToProcess = ONLY_LOCALES
      ? TARGET_LOCALES.filter((l) => ONLY_LOCALES.includes(l))
      : TARGET_LOCALES

    for (const locale of localesToProcess) {
      console.log(`\n[translate:${locale}] Starting locale…`)

      for (let i = 0; i < enTranslations.length; i++) {
        const enTranslation = enTranslations[i]
        const articleId = enTranslation.articleId
        const tag = `[translate:${locale}] ${i + 1}/${total}`

        try {
          // Check if a translation already exists for this locale
          const existing = await prisma.articleTranslation.findUnique({
            where: { articleId_locale: { articleId, locale } },
          })

          // Skip if exists and is not in a draft state (i.e. IN_REVIEW or PUBLISHED)
          // unless --force is set, which re-translates everything.
          if (
            !FORCE &&
            !RETRY_FAILED &&
            existing &&
            existing.status !== "DRAFT" &&
            existing.status !== "AI_DRAFT"
          ) {
            console.log(`${tag} SKIP (${existing.status}) ${enTranslation.title}`)
            totalSkipped++
            continue
          }

          // --retry-failed: skip articles whose translation title differs from EN
          // (i.e. they were already translated successfully — only retry if title matches EN)
          if (RETRY_FAILED && existing && existing.title !== enTranslation.title) {
            totalSkipped++
            continue
          }

          // ── Delimiter-based text-extraction approach ───────────────────────
          // We extract all text nodes from the Tiptap JSON and send them as a
          // delimiter-separated list (not JSON). This avoids all JSON escaping
          // issues — Claude often produces unescaped newlines/quotes inside JSON
          // strings, causing parse failures even for small articles.
          //
          // Format:
          //   ===TITLE===\nArticle title\n===EXCERPT===\nExcerpt\n===1===\nText 1\n===2===\n...
          //
          // Parsing: split on /===\w+===\n/ markers to recover each field in order.

          const textNodes: string[] = []
          collectTexts(enTranslation.content, textNodes)

          // Build delimiter-format input
          const inputLines: string[] = [
            "===TITLE===",
            enTranslation.title,
            "===EXCERPT===",
            enTranslation.excerpt ?? "",
            ...textNodes.flatMap((t, idx) => [`===${idx + 1}===`, t]),
          ]
          const inputText = inputLines.join("\n")

          const response = await callWithRetry(
            () =>
              client.messages.create({
                model: "claude-sonnet-4-6",
                max_tokens: 8192,
                messages: [
                  {
                    role: "user",
                    content: `Translate every labelled section below to ${LOCALE_INSTRUCTIONS[locale]}

Rules:
- Return ONLY the same delimiter format — no extra text, no markdown
- Keep the delimiters (===TITLE===, ===EXCERPT===, ===1===, etc.) exactly as-is
- Preserve the EXACT number of sections and their order
- Translate the text that follows each delimiter
- Keep URLs, code snippets, product names, file paths, and numbers unchanged
- Empty sections stay empty

${inputText}`,
                  },
                ],
              }),
            tag
          )

          const rawText =
            response.content[0].type === "text" ? response.content[0].text : ""

          // Parse delimiter-format response
          function parseDelimited(raw: string): { title: string; excerpt: string; texts: string[] } {
            // Split into segments: [delimiter, content, delimiter, content, ...]
            const segments = raw.split(/\n?===([A-Z0-9]+)===\n?/)
            // segments[0] is text before first delimiter (discard)
            // segments[1] = key, segments[2] = value, segments[3] = key, ...
            const map: Record<string, string> = {}
            for (let j = 1; j < segments.length - 1; j += 2) {
              map[segments[j]] = (segments[j + 1] ?? "").replace(/\n$/, "")
            }
            const title = map["TITLE"] ?? enTranslation.title
            const excerpt = map["EXCERPT"] ?? ""
            const texts: string[] = []
            for (let j = 1; j <= textNodes.length; j++) {
              texts.push(map[String(j)] ?? textNodes[j - 1])
            }
            return { title, excerpt, texts }
          }

          const parsed = parseDelimited(rawText)

          if (parsed.texts.length !== textNodes.length) {
            throw new Error(
              `Text count mismatch: expected ${textNodes.length}, got ${parsed.texts.length}`
            )
          }

          // Merge translated texts back into the Tiptap document structure
          const translatedContent = applyTexts(
            enTranslation.content,
            parsed.texts,
            { i: 0 }
          )

          await prisma.articleTranslation.upsert({
            where: { articleId_locale: { articleId: enTranslation.article.id, locale } },
            create: {
              articleId: enTranslation.article.id,
              locale,
              title: parsed.title,
              content: translatedContent as object,
              excerpt: parsed.excerpt,
              status: "AI_DRAFT",
            },
            update: {
              title: parsed.title,
              content: translatedContent as object,
              excerpt: parsed.excerpt,
              status: "AI_DRAFT",
            },
          })

          console.log(`${tag} ${enTranslation.title}`)
          totalTranslated++
        } catch (err) {
          console.warn(
            `${tag} WARNING: Failed to translate "${enTranslation.title}":`,
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
