import * as cheerio from "cheerio"
import type { AnyNode, Element as DomElement, Text as DomText } from "domhandler"
import fs from "fs/promises"
import path from "path"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

// Load env vars from .env.local (Prisma v7 requires adapter pattern)
process.loadEnvFile(path.join(process.cwd(), ".env.local"))

function createPrisma() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL not set")
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

const prisma = createPrisma()

const SCRAPED_DIR = path.join(process.cwd(), "scripts", "scraped")

// ─── Category slug mapping (scraped → DB) ─────────────────────────────────────
// Maps HubSpot category slugs to the new DB category slugs
const CATEGORY_SLUG_MAP: Record<string, string> = {
  "organisational-roll-out": "organisation-rollout",
  "it-onboarding": "it-setup-onboarding",
  "data-sources": "using-the-platform",
  "compliance-server-how-to-videos": "using-the-platform",
  "data-more-videos": "video-library",
  "security-compliance": "security-compliance",
  "operations-updates": "operations-updates",
  "getting-started": "getting-started",
}

function mapCategorySlug(raw: string): string {
  return CATEGORY_SLUG_MAP[raw] ?? raw
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScrapedArticle {
  title: string
  slug: string
  categorySlug: string
  html: string
  sourceUrl: string
}

// Tiptap node types (simplified)
interface TiptapMark {
  type: string
  attrs?: Record<string, unknown>
}

interface TiptapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  text?: string
  marks?: TiptapMark[]
}

interface TiptapDoc {
  type: "doc"
  content: TiptapNode[]
}

// ─── Slug helpers ─────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

async function uniqueSlug(base: string, existingSlugs: Set<string>): Promise<string> {
  if (!existingSlugs.has(base)) {
    existingSlugs.add(base)
    return base
  }
  let i = 2
  while (existingSlugs.has(`${base}-${i}`)) i++
  const result = `${base}-${i}`
  existingSlugs.add(result)
  return result
}

// ─── HTML → Tiptap conversion ─────────────────────────────────────────────────

/**
 * Parse inline children of an element into Tiptap text/mark nodes.
 */
function parseInline(
  $: cheerio.CheerioAPI,
  el: AnyNode,
  inheritedMarks: TiptapMark[] = []
): TiptapNode[] {
  const nodes: TiptapNode[] = []

  $(el)
    .contents()
    .each((_i, child) => {
      if (child.type === "text") {
        const text = (child as DomText).data ?? ""
        if (!text) return
        const node: TiptapNode = { type: "text", text }
        if (inheritedMarks.length > 0) {
          node.marks = [...inheritedMarks]
        }
        nodes.push(node)
        return
      }

      if (child.type !== "tag") return
      const tag = (child as DomElement).tagName.toLowerCase()

      let marks: TiptapMark[] = [...inheritedMarks]

      switch (tag) {
        case "strong":
        case "b":
          marks = [...marks, { type: "bold" }]
          break
        case "em":
        case "i":
          marks = [...marks, { type: "italic" }]
          break
        case "u":
          marks = [...marks, { type: "underline" }]
          break
        case "a": {
          const href = $(child).attr("href") ?? ""
          marks = [...marks, { type: "link", attrs: { href } }]
          break
        }
        case "code":
          marks = [...marks, { type: "code" }]
          break
        default:
          // For unknown inline tags, recurse without adding marks
          break
      }

      // Recurse into the child element
      const children = parseInline($, child, marks)
      nodes.push(...children)
    })

  return nodes
}

/**
 * Parse block-level children into Tiptap block nodes.
 */
function parseBlock($: cheerio.CheerioAPI, elements: cheerio.Cheerio<AnyNode>): TiptapNode[] {
  const nodes: TiptapNode[] = []

  elements.each((_i, el) => {
    if (el.type === "text") {
      // Loose text nodes at block level — wrap in paragraph if non-empty
      const text = (el as DomText).data?.trim() ?? ""
      if (text) {
        nodes.push({ type: "paragraph", content: [{ type: "text", text }] })
      }
      return
    }

    if (el.type !== "tag") return

    const tag = (el as DomElement).tagName.toLowerCase()
    const $el = $(el)

    switch (tag) {
      case "h1":
      case "h2":
      case "h3":
      case "h4": {
        const level = parseInt(tag[1], 10)
        const content = parseInline($, el)
        if (content.length > 0) {
          nodes.push({ type: "heading", attrs: { level }, content })
        }
        break
      }

      case "p": {
        const content = parseInline($, el)
        // Only emit a paragraph if there's actual content
        if (content.length > 0) {
          nodes.push({ type: "paragraph", content })
        } else {
          // Preserve empty paragraphs as a blank paragraph node
          nodes.push({ type: "paragraph" })
        }
        break
      }

      case "ul": {
        const items = $el
          .children("li")
          .map((_j, li) => ({
            type: "listItem" as const,
            content: [{ type: "paragraph", content: parseInline($, li) }],
          }))
          .get()
        if (items.length > 0) {
          nodes.push({ type: "bulletList", content: items })
        }
        break
      }

      case "ol": {
        const items = $el
          .children("li")
          .map((_j, li) => ({
            type: "listItem" as const,
            content: [{ type: "paragraph", content: parseInline($, li) }],
          }))
          .get()
        if (items.length > 0) {
          nodes.push({ type: "orderedList", content: items })
        }
        break
      }

      case "blockquote": {
        const inner = parseBlock($, $el.children())
        if (inner.length > 0) {
          nodes.push({ type: "blockquote", content: inner })
        }
        break
      }

      case "pre": {
        // Check for nested <code>
        const codeEl = $el.find("code")
        const text = codeEl.length ? codeEl.text() : $el.text()
        nodes.push({
          type: "codeBlock",
          content: [{ type: "text", text }],
        })
        break
      }

      case "code": {
        // Block-level <code> not inside <pre> — treat as codeBlock
        nodes.push({
          type: "codeBlock",
          content: [{ type: "text", text: $el.text() }],
        })
        break
      }

      case "img": {
        const src = $el.attr("src") ?? ""
        nodes.push({ type: "image", attrs: { src } })
        break
      }

      case "hr": {
        nodes.push({ type: "horizontalRule" })
        break
      }

      default:
        // For unknown block elements, try to parse their children recursively
        nodes.push(...parseBlock($, $el.children()))
        break
    }
  })

  return nodes
}

/**
 * Convert an HTML string to a Tiptap JSON document.
 */
function htmlToTiptapDoc(html: string): TiptapDoc {
  const $ = cheerio.load(`<div id="__root">${html}</div>`)
  const root = $("#__root")
  const nodes = parseBlock($, root.children())
  return {
    type: "doc",
    content: nodes.filter(Boolean),
  }
}

// ─── Excerpt helper ───────────────────────────────────────────────────────────

function extractExcerpt(html: string, maxLen = 160): string {
  // Strip HTML tags and collapse whitespace
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return text.length <= maxLen ? text : text.slice(0, maxLen).replace(/\s+\S*$/, "")
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Read all scraped JSON files
  let files: string[]
  try {
    const entries = await fs.readdir(SCRAPED_DIR)
    files = entries.filter((f) => f.endsWith(".json"))
  } catch {
    console.error(`[import] ERROR: Could not read scraped directory at ${SCRAPED_DIR}`)
    console.error("[import] Run scripts/scrape-hubspot.ts first.")
    process.exit(1)
  }

  if (files.length === 0) {
    console.log("[import] No scraped JSON files found. Nothing to import.")
    return
  }

  console.log(`[import] Found ${files.length} scraped articles`)

  // 2. Read existing categories from DB
  const categories = await prisma.category.findMany({
    include: { translations: true },
  })

  // Build slug → category ID map
  const categoryIdBySlug = new Map<string, string>()
  for (const cat of categories) {
    categoryIdBySlug.set(cat.slug, cat.id)
  }

  // 3. Collect existing article slugs from DB to detect duplicates
  const existingArticles = await prisma.article.findMany({ select: { slug: true } })
  const existingSlugs = new Set(existingArticles.map((a) => a.slug))

  let imported = 0
  let skipped = 0

  for (const file of files) {
    const filePath = path.join(SCRAPED_DIR, file)
    const raw = await fs.readFile(filePath, "utf-8")
    let article: ScrapedArticle

    try {
      article = JSON.parse(raw) as ScrapedArticle
    } catch {
      console.warn(`[import] WARN: Could not parse ${file}, skipping`)
      skipped++
      continue
    }

    // 4. Skip if article with same slug already exists in DB
    if (existingSlugs.has(article.slug)) {
      console.log(`[import] SKIP (exists) ${article.slug}`)
      skipped++
      continue
    }

    // 5. Convert HTML to Tiptap JSON
    const content = htmlToTiptapDoc(article.html)

    // 6. Generate excerpt from raw HTML
    const excerpt = extractExcerpt(article.html)

    // 7. Resolve category ID (null if not found) — apply slug mapping
    const mappedCategorySlug = mapCategorySlug(article.categorySlug)
    const categoryId = categoryIdBySlug.get(mappedCategorySlug) ?? null

    if (!categoryId) {
      console.warn(
        `[import] WARN: No category found for slug "${article.categorySlug}" → "${mappedCategorySlug}" (article: ${article.slug})`
      )
    }

    // 8. Generate a unique slug (deduplicating against DB + already-processed in this run)
    const safeSlug = await uniqueSlug(slugify(article.slug), existingSlugs)

    // 9. Create Article + ArticleTranslation in a transaction
    await prisma.$transaction(async (tx) => {
      const created = await tx.article.create({
        data: {
          slug: safeSlug,
          categoryId,
          isGated: false,
          position: 0,
        },
      })

      await tx.articleTranslation.create({
        data: {
          articleId: created.id,
          locale: "en",
          title: article.title,
          content: content as object,
          excerpt,
          status: "DRAFT",
        },
      })
    })

    console.log(`[import] ${article.slug}`)
    imported++
  }

  console.log(`[import] Done. Imported: ${imported}, Skipped: ${skipped}`)

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
