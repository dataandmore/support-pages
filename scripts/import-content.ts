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

// Pass --update flag to overwrite existing articles (default: skip)
const UPSERT_MODE = process.argv.includes("--update")

// ─── Category slug mapping (scraped → DB) ─────────────────────────────────────
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
 * Resolve image src — HubSpot sometimes lazy-loads with data-src / data-lazy-src.
 */
function resolveImgSrc($el: cheerio.Cheerio<AnyNode>): string {
  return (
    $el.attr("src") ??
    $el.attr("data-src") ??
    $el.attr("data-lazy-src") ??
    $el.attr("data-original") ??
    ""
  )
}

/**
 * Resolve video embed src — HubSpot uses data-hsv-src for lazy-loaded iframes.
 */
function resolveIframeSrc($el: cheerio.Cheerio<AnyNode>): string {
  return (
    $el.attr("src") ??
    $el.attr("data-hsv-src") ??
    $el.attr("data-src") ??
    ""
  )
}

/**
 * Parse inline children of an element into Tiptap text/mark nodes.
 * NOTE: <img> inside inline context is intentionally excluded here —
 * the block-level <p> parser extracts images before calling this.
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
        if (!text || !text.trim()) return
        const node: TiptapNode = { type: "text", text }
        if (inheritedMarks.length > 0) node.marks = [...inheritedMarks]
        nodes.push(node)
        return
      }

      if (child.type !== "tag") return
      const tag = (child as DomElement).tagName.toLowerCase()

      // Skip images — handled at block level
      if (tag === "img") return

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
          break
      }

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
      const text = (el as DomText).data?.trim() ?? ""
      if (text) nodes.push({ type: "paragraph", content: [{ type: "text", text }] })
      return
    }

    if (el.type !== "tag") return

    const tag = (el as DomElement).tagName.toLowerCase()
    const $el = $(el)

    switch (tag) {
      // ── Headings ────────────────────────────────────────────────────────
      case "h1":
      case "h2":
      case "h3":
      case "h4": {
        const level = parseInt(tag[1], 10)
        const content = parseInline($, el)
        if (content.length > 0) nodes.push({ type: "heading", attrs: { level }, content })
        break
      }

      // ── Paragraphs (may contain images!) ────────────────────────────────
      case "p": {
        const imgs = $el.find("img")

        if (imgs.length > 0) {
          // Extract images as block nodes; remaining text as a paragraph
          const textContent = parseInline($, el) // skips <img> by design
          if (textContent.length > 0) nodes.push({ type: "paragraph", content: textContent })
          imgs.each((_j, img) => {
            const src = resolveImgSrc($(img))
            if (src) {
              nodes.push({
                type: "image",
                attrs: {
                  src,
                  alt: $(img).attr("alt") ?? "",
                  title: $(img).attr("title") ?? null,
                },
              })
            }
          })
        } else {
          // Normal paragraph
          const content = parseInline($, el)
          nodes.push(content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" })
        }
        break
      }

      // ── Lists ────────────────────────────────────────────────────────────
      case "ul": {
        const items = $el
          .children("li")
          .map((_j, li) => ({
            type: "listItem" as const,
            content: [{ type: "paragraph", content: parseInline($, li) }],
          }))
          .get()
        if (items.length > 0) nodes.push({ type: "bulletList", content: items })
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
        if (items.length > 0) nodes.push({ type: "orderedList", content: items })
        break
      }

      // ── Block quotes ─────────────────────────────────────────────────────
      case "blockquote": {
        const inner = parseBlock($, $el.children())
        if (inner.length > 0) nodes.push({ type: "blockquote", content: inner })
        break
      }

      // ── Tables ────────────────────────────────────────────────────────────
      // HubSpot uses <table><tbody><tr><td|th> (sometimes with thead).
      // Tiptap requires: table → tableRow → tableHeader|tableCell → paragraph.
      case "table": {
        const rows: TiptapNode[] = []
        // Select all rows regardless of thead/tbody/tfoot nesting
        $el.find("tr").each((_j, tr) => {
          const cells: TiptapNode[] = []
          $(tr).children("th, td").each((_k, cell) => {
            const $cell = $(cell)
            const isHeader = (cell as DomElement).tagName.toLowerCase() === "th"
            const colspan = parseInt($cell.attr("colspan") ?? "1", 10) || 1
            const rowspan = parseInt($cell.attr("rowspan") ?? "1", 10) || 1

            // If the cell contains block-level children, parse them as blocks;
            // otherwise wrap the inline content in a paragraph.
            const hasBlocks = $cell.children("p, ul, ol, h1, h2, h3, h4, blockquote, pre, table").length > 0
            let cellContent: TiptapNode[]
            if (hasBlocks) {
              cellContent = parseBlock($, $cell.children())
            } else {
              const inline = parseInline($, cell)
              cellContent = [{ type: "paragraph", content: inline.length > 0 ? inline : [{ type: "text", text: "" }] }]
            }

            cells.push({
              type: isHeader ? "tableHeader" : "tableCell",
              attrs: { colspan, rowspan, colwidth: null },
              content: cellContent,
            })
          })
          if (cells.length > 0) rows.push({ type: "tableRow", content: cells })
        })
        if (rows.length > 0) nodes.push({ type: "table", content: rows })
        break
      }

      // ── Code ──────────────────────────────────────────────────────────────
      case "pre": {
        const codeEl = $el.find("code")
        const text = codeEl.length ? codeEl.text() : $el.text()
        nodes.push({ type: "codeBlock", content: [{ type: "text", text }] })
        break
      }

      case "code": {
        nodes.push({ type: "codeBlock", content: [{ type: "text", text: $el.text() }] })
        break
      }

      // ── Images ────────────────────────────────────────────────────────────
      case "img": {
        const src = resolveImgSrc($el)
        if (src) {
          nodes.push({
            type: "image",
            attrs: {
              src,
              alt: $el.attr("alt") ?? "",
              title: $el.attr("title") ?? null,
            },
          })
        }
        break
      }

      // ── Video iframes (HubSpot, Synthesia, YouTube, …) ───────────────────
      case "iframe": {
        const src = resolveIframeSrc($el)
        if (src) {
          const title = $el.attr("title") ?? ""
          nodes.push({ type: "videoEmbed", attrs: { src, title } })
        }
        break
      }

      // ── Horizontal rule ───────────────────────────────────────────────────
      case "hr": {
        nodes.push({ type: "horizontalRule" })
        break
      }

      // ── Unknown / wrapper elements — recurse into children ─────────────────
      default:
        // Check if a descendant is an iframe (video wrapper divs)
        const iframes = $el.find("iframe")
        if (iframes.length > 0) {
          iframes.each((_j, iframe) => {
            const src = resolveIframeSrc($(iframe))
            if (src) {
              const title = $(iframe).attr("title") ?? ""
              nodes.push({ type: "videoEmbed", attrs: { src, title } })
            }
          })
          // Also recurse for any non-iframe content inside the wrapper
          const childNodes = parseBlock($, $el.children().not("iframe, div:has(iframe)"))
          nodes.push(...childNodes)
        } else {
          nodes.push(...parseBlock($, $el.children()))
        }
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
  return { type: "doc", content: nodes.filter(Boolean) }
}

// ─── Excerpt helper ───────────────────────────────────────────────────────────

function extractExcerpt(html: string, maxLen = 160): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return text.length <= maxLen ? text : text.slice(0, maxLen).replace(/\s+\S*$/, "")
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[import] Mode: ${UPSERT_MODE ? "UPDATE (upsert)" : "INSERT (skip existing)"}`)
  console.log("[import] Pass --update to overwrite existing articles\n")

  let files: string[]
  try {
    const entries = await fs.readdir(SCRAPED_DIR)
    files = entries.filter((f) => f.endsWith(".json"))
  } catch {
    console.error(`[import] ERROR: Could not read scraped directory at ${SCRAPED_DIR}`)
    process.exit(1)
  }

  if (files.length === 0) {
    console.log("[import] No scraped JSON files found. Run scripts/scrape-hubspot.ts first.")
    return
  }

  console.log(`[import] Found ${files.length} scraped articles`)

  // Load categories from DB
  const categories = await prisma.category.findMany({ include: { translations: true } })
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]))

  // Load existing article slugs
  const existingArticles = await prisma.article.findMany({
    select: { id: true, slug: true },
  })
  const existingBySlug = new Map(existingArticles.map((a) => [a.slug, a.id]))
  const existingSlugs = new Set(existingBySlug.keys())

  let inserted = 0
  let updated = 0
  let skipped = 0

  for (let i = 0; i < files.length; i++) {
    const filePath = path.join(SCRAPED_DIR, files[i])
    const raw = await fs.readFile(filePath, "utf-8")
    let article: ScrapedArticle

    try {
      article = JSON.parse(raw) as ScrapedArticle
    } catch {
      console.warn(`[import] WARN: Could not parse ${files[i]}, skipping`)
      skipped++
      continue
    }

    const content = htmlToTiptapDoc(article.html)
    const excerpt = extractExcerpt(article.html)
    const mappedCategorySlug = mapCategorySlug(article.categorySlug)
    const categoryId = categoryIdBySlug.get(mappedCategorySlug) ?? null

    if (!categoryId) {
      console.warn(
        `[import] WARN: No category for "${article.categorySlug}" → "${mappedCategorySlug}" (${article.slug})`
      )
    }

    const existingId = existingBySlug.get(article.slug)

    if (existingId) {
      if (!UPSERT_MODE) {
        process.stdout.write(`[import] SKIP ${article.slug}\n`)
        skipped++
        continue
      }

      // Update existing article's EN translation
      await prisma.articleTranslation.upsert({
        where: { articleId_locale: { articleId: existingId, locale: "en" } },
        update: {
          title: article.title,
          content: content as object,
          excerpt,
        },
        create: {
          articleId: existingId,
          locale: "en",
          title: article.title,
          content: content as object,
          excerpt,
          status: "DRAFT",
        },
      })

      // Update category if changed
      await prisma.article.update({
        where: { id: existingId },
        data: { categoryId },
      })

      process.stdout.write(`[import] UPDATE ${article.slug}\n`)
      updated++
    } else {
      // New article
      const safeSlug = await uniqueSlug(slugify(article.slug), existingSlugs)

      await prisma.$transaction(async (tx) => {
        const created = await tx.article.create({
          data: { slug: safeSlug, categoryId, isGated: false, position: 0 },
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

      process.stdout.write(`[import] INSERT ${article.slug}\n`)
      inserted++
    }
  }

  console.log(`\n[import] Done. Inserted: ${inserted}  Updated: ${updated}  Skipped: ${skipped}`)
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
