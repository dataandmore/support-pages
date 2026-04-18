import * as cheerio from "cheerio"
import fs from "fs/promises"
import path from "path"

const BASE_URL = "https://support.dataandmore.com"
const KNOWLEDGE_BASE = `${BASE_URL}/en/knowledge`
// __dirname equivalent for ESM / tsx
const OUTPUT_DIR = path.join(process.cwd(), "scripts", "scraped")
const DELAY_MS = 300

interface ScrapedArticle {
  title: string
  slug: string
  categorySlug: string
  html: string
  sourceUrl: string
}

// ─── Category mapping ─────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  "getting-started": "getting-started",
  "account-settings": "account-settings",
  "integrations": "integrations",
  "billing": "billing",
  "troubleshooting": "troubleshooting",
  // fallback: use the raw slug as-is
}

function normalizeCategory(raw: string): string {
  return CATEGORY_MAP[raw] ?? raw
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function resolveUrl(href: string): string {
  if (href.startsWith("http")) return href
  return `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`
}

function slugFromUrl(url: string): string {
  const { pathname } = new URL(url)
  // Strip trailing slash, take last path segment
  const parts = pathname.replace(/\/$/, "").split("/").filter(Boolean)
  return parts[parts.length - 1] ?? "unknown"
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`[scrape] WARN: HTTP ${res.status} — ${url}`)
      return null
    }
    return await res.text()
  } catch (err) {
    console.warn(`[scrape] WARN: fetch failed for ${url} —`, err)
    return null
  }
}

// ─── URL collection ───────────────────────────────────────────────────────────

/**
 * Returns a map of articleUrl → categorySlug.
 *
 * Strategy:
 *   1. Fetch the index page and collect category-level URLs
 *      (all /en/knowledge/<slug> links except the index itself and /kb-tickets/new)
 *   2. For each category page, collect article links using the
 *      HubSpot-specific selector: a.hs-kb-category-article-list__link
 *   3. The category slug comes from the category page URL, since the site is
 *      flat (/en/knowledge/article-slug, not /en/knowledge/category/article).
 */
async function collectArticleUrls(): Promise<Map<string, string>> {
  // articleUrl → categorySlug
  const articles = new Map<string, string>()

  // Step 1: fetch index page
  const indexHtml = await fetchHtml(KNOWLEDGE_BASE)
  if (!indexHtml) {
    throw new Error("Failed to fetch knowledge base index page")
  }

  const $index = cheerio.load(indexHtml)

  // Collect category-level pages from the index
  const categoryUrls = new Set<string>()
  $index("a[href]").each((_i, el) => {
    const href = $index(el).attr("href") ?? ""
    if (!href.includes("/en/knowledge/")) return
    const full = resolveUrl(href)
    const { pathname } = new URL(full)
    // Must be exactly /en/knowledge/<slug> — not the index, not /kb-tickets/new, no fragment
    const parts = pathname.replace(/^\/en\/knowledge\/?/, "").split("/").filter(Boolean)
    if (parts.length === 1 && parts[0] !== "kb-tickets") {
      categoryUrls.add(full)
    }
  })

  console.log(`[scrape] Found ${categoryUrls.size} category pages on index`)

  // Step 2: scrape each category page for article links
  for (const catUrl of categoryUrls) {
    const catSlug = slugFromUrl(catUrl)
    const categorySlug = normalizeCategory(catSlug)

    const catHtml = await fetchHtml(catUrl)
    if (!catHtml) {
      console.warn(`[scrape] WARN: could not fetch category: ${catUrl}`)
      await delay(DELAY_MS)
      continue
    }

    const $cat = cheerio.load(catHtml)

    // Primary: HubSpot article list links within category pages
    $cat("a.hs-kb-category-article-list__link").each((_i, el) => {
      const href = $cat(el).attr("href") ?? ""
      if (!href) return
      const full = resolveUrl(href)
      if (!articles.has(full)) {
        articles.set(full, categorySlug)
      }
    })

    // Fallback: any /en/knowledge/<slug> link (excluding the category itself and the index)
    if ($cat("a.hs-kb-category-article-list__link").length === 0) {
      $cat("a[href]").each((_i, el) => {
        const href = $cat(el).attr("href") ?? ""
        if (!href.includes("/en/knowledge/")) return
        const full = resolveUrl(href)
        const { pathname } = new URL(full)
        const parts = pathname.replace(/^\/en\/knowledge\/?/, "").split("/").filter(Boolean)
        if (parts.length === 1 && full !== catUrl && full !== KNOWLEDGE_BASE) {
          if (!articles.has(full)) {
            articles.set(full, categorySlug)
          }
        }
      })
    }

    await delay(DELAY_MS)
  }

  return articles
}

// ─── Article scraping ─────────────────────────────────────────────────────────

/**
 * Extract the main article body HTML. HubSpot KB articles use these classes
 * (tried in order — first non-empty wins).
 */
function extractArticleBody($: cheerio.CheerioAPI): string {
  const selectors = [
    ".article-body",        // some HubSpot themes
    ".hs-blog-post",        // blog-style KB
    ".article-wrapper",     // this site's theme
    ".hs-kb-content",       // fallback HubSpot content container
    ".content-wrapper",     // generic
    "article",              // semantic HTML
    "main",                 // last resort
  ]
  for (const sel of selectors) {
    const el = $(sel)
    if (el.length) {
      const html = el.html()?.trim()
      if (html) return html
    }
  }
  return ""
}

async function scrapeArticle(
  url: string,
  categorySlug: string
): Promise<ScrapedArticle | null> {
  const html = await fetchHtml(url)
  if (!html) return null

  const $ = cheerio.load(html)

  const title =
    $("h1").first().text().trim() ||
    $("title").text().trim().split("|")[0].trim() ||
    "Untitled"

  const body = extractArticleBody($)
  if (!body) {
    console.warn(`[scrape] WARN: empty body — ${url}`)
    return null
  }

  return {
    title,
    slug: slugFromUrl(url),
    categorySlug,
    html: body,
    sourceUrl: url,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  console.log("[scrape] Collecting article URLs from", KNOWLEDGE_BASE)
  const articleMap = await collectArticleUrls()
  const entries = Array.from(articleMap.entries())
  const total = entries.length
  console.log(`[scrape] Found ${total} article URLs`)

  let saved = 0
  for (let i = 0; i < entries.length; i++) {
    const [url, categorySlug] = entries[i]
    const slug = slugFromUrl(url)
    console.log(`[scrape] ${i + 1}/${total} ${slug}`)

    const article = await scrapeArticle(url, categorySlug)
    if (!article) {
      await delay(DELAY_MS)
      continue
    }

    const outPath = path.join(OUTPUT_DIR, `${article.slug}.json`)
    await fs.writeFile(outPath, JSON.stringify(article, null, 2), "utf-8")
    saved++

    await delay(DELAY_MS)
  }

  console.log(`[scrape] Done. Saved ${saved}/${total} articles to ${OUTPUT_DIR}`)
}

main().catch(console.error)
