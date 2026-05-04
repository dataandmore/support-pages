import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { z } from "zod"
import { searchArticles } from "@/lib/search"
import { prisma } from "@/lib/prisma"
import { isValidLocale, defaultLocale, type Locale } from "@/lib/i18n"
import { tiptapToMarkdown } from "@/lib/tiptap-to-markdown"

const LOCALES = ["en", "da", "sv", "de"] as const

function validLocale(locale: string): Locale {
  return isValidLocale(locale) ? (locale as Locale) : (defaultLocale as Locale)
}

function createServer() {
  const server = new McpServer({
    name: "dam-support",
    version: "1.0.0",
  })

  // ── search ──
  server.tool(
    "search",
    "Search the Data & More knowledge base for articles matching a query",
    { query: z.string().describe("Search query text"), locale: z.enum(LOCALES).default("en") },
    async ({ query, locale }) => {
      const results = await searchArticles(query, validLocale(locale))
      if (results.length === 0) {
        return { content: [{ type: "text" as const, text: `No results found for "${query}".` }] }
      }
      const text = results
        .map((r, i) => `${i + 1}. **${r.title}**${r.categoryName ? ` [${r.categoryName}]` : ""}\n   ${r.excerpt ?? ""}\n   Slug: ${r.slug}`)
        .join("\n\n")
      return { content: [{ type: "text" as const, text: `Found ${results.length} result(s):\n\n${text}` }] }
    }
  )

  // ── list-categories ──
  server.tool(
    "list-categories",
    "List all knowledge base categories with article counts",
    { locale: z.enum(LOCALES).default("en") },
    async ({ locale }) => {
      const vl = validLocale(locale)
      const categories = await prisma.category.findMany({
        orderBy: { position: "asc" },
        where: { parentId: null },
        include: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          translations: { where: { locale: vl as any } },
          _count: { select: { articles: { where: { translations: { some: { locale: vl as Locale, status: "PUBLISHED" } } } } } },
        },
      })
      const text = categories
        .map((cat) => {
          const name = cat.translations[0]?.name ?? cat.slug
          const desc = cat.translations[0]?.description
          return `- **${name}** (${cat._count.articles} articles) — slug: \`${cat.slug}\`${desc ? `\n  ${desc}` : ""}`
        })
        .join("\n\n")
      return { content: [{ type: "text" as const, text: `Categories (${locale}):\n\n${text}` }] }
    }
  )

  // ── list-articles ──
  server.tool(
    "list-articles",
    "List articles, optionally filtered by category slug",
    { category: z.string().optional().describe("Category slug to filter by"), locale: z.enum(LOCALES).default("en") },
    async ({ category, locale }) => {
      const vl = validLocale(locale)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = { translations: { some: { locale: vl, status: "PUBLISHED" } } }
      if (category) where.category = { slug: category }
      const articles = await prisma.article.findMany({
        where,
        orderBy: { position: "asc" },
        include: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          translations: { where: { locale: vl as any, status: "PUBLISHED" }, select: { title: true, excerpt: true } },
          category: { include: { translations: { where: { locale: vl as Locale }, select: { name: true } } } },
          tags: { include: { tag: { select: { name: true } } } },
        },
      })
      if (articles.length === 0) {
        return { content: [{ type: "text" as const, text: `No published articles found.` }] }
      }
      const text = articles
        .map((a) => {
          const title = a.translations[0]?.title ?? a.slug
          const excerpt = a.translations[0]?.excerpt
          const catName = a.category?.translations[0]?.name
          const tags = a.tags.map((t) => t.tag.name)
          let line = `- **${title}**${a.pinned ? " (pinned)" : ""}${catName ? ` [${catName}]` : ""}`
          if (excerpt) line += `\n  ${excerpt}`
          if (tags.length) line += `\n  Tags: ${tags.join(", ")}`
          line += `\n  Slug: \`${a.slug}\``
          return line
        })
        .join("\n\n")
      return { content: [{ type: "text" as const, text: `${articles.length} article(s):\n\n${text}` }] }
    }
  )

  // ── get-article ──
  server.tool(
    "get-article",
    "Read the full content of a specific article by its slug",
    { slug: z.string().describe("Article slug"), locale: z.enum(LOCALES).default("en") },
    async ({ slug, locale }) => {
      const vl = validLocale(locale)
      const article = await prisma.article.findUnique({
        where: { slug },
        include: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          translations: { where: { locale: vl as any, status: "PUBLISHED" } },
          category: { include: { translations: { where: { locale: vl as Locale }, select: { name: true } } } },
          tags: { include: { tag: { select: { name: true } } } },
        },
      })
      if (!article || article.translations.length === 0) {
        return { content: [{ type: "text" as const, text: `Article "${slug}" not found in "${locale}".` }] }
      }
      const t = article.translations[0]
      const content = tiptapToMarkdown(t.content)
      let text = `# ${t.title}\n\n`
      if (article.category) text += `Category: ${article.category.translations[0]?.name ?? article.category.slug}\n`
      const tags = article.tags.map((at) => at.tag.name)
      if (tags.length) text += `Tags: ${tags.join(", ")}\n`
      text += `\n---\n\n${content}`
      return { content: [{ type: "text" as const, text }] }
    }
  )

  // ── list-videos ──
  server.tool(
    "list-videos",
    "List available video tutorials and walkthroughs",
    { locale: z.enum(LOCALES).default("en") },
    async ({ locale }) => {
      const vl = validLocale(locale)
      const videos = await prisma.video.findMany({
        where: { status: "READY", translations: { some: { locale: vl as Locale } } },
        orderBy: { createdAt: "desc" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        include: { translations: { where: { locale: vl as any } } },
      })
      if (videos.length === 0) {
        return { content: [{ type: "text" as const, text: `No videos available.` }] }
      }
      const text = videos
        .map((v) => {
          const title = v.translations[0]?.title ?? v.originalFilename
          const desc = v.translations[0]?.description
          const dur = v.duration ? `${Math.floor(v.duration / 60)}:${String(Math.floor(v.duration % 60)).padStart(2, "0")}` : null
          let line = `- **${title}**${dur ? ` (${dur})` : ""}${v.pinned ? " [Featured]" : ""}`
          if (desc) line += `\n  ${desc}`
          return line
        })
        .join("\n\n")
      return { content: [{ type: "text" as const, text: `${videos.length} video(s):\n\n${text}` }] }
    }
  )

  return server
}

// Each request creates a fresh stateless transport + server (no session state needed)
async function handleMcpRequest(req: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  })

  const server = createServer()
  await server.connect(transport)

  try {
    return await transport.handleRequest(req)
  } finally {
    await transport.close()
    await server.close()
  }
}

export async function GET(req: Request) {
  return handleMcpRequest(req)
}

export async function POST(req: Request) {
  return handleMcpRequest(req)
}

export async function DELETE(req: Request) {
  return handleMcpRequest(req)
}
