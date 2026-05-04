#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL =
  process.env.DAM_SUPPORT_URL ?? "https://cs.dataandmore.com";

const LOCALES = ["en", "da", "sv", "de"] as const;

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`);
  }
  return res.json() as Promise<T>;
}

// ── Server setup ──────────────────────────────────────────────

const server = new McpServer({
  name: "dam-support",
  version: "1.0.0",
});

// ── Tool: search ──────────────────────────────────────────────

server.tool(
  "search",
  "Search the Data & More knowledge base for articles matching a query",
  {
    query: z.string().describe("Search query text"),
    locale: z
      .enum(LOCALES)
      .default("en")
      .describe("Language: en, da, sv, or de"),
  },
  async ({ query, locale }) => {
    const data = await fetchJson<{
      results: Array<{
        slug: string;
        title: string;
        excerpt: string | null;
        categorySlug: string | null;
        categoryName: string | null;
      }>;
    }>(`/api/search?q=${encodeURIComponent(query)}&locale=${locale}`);

    if (data.results.length === 0) {
      return {
        content: [
          { type: "text", text: `No results found for "${query}" (${locale}).` },
        ],
      };
    }

    const text = data.results
      .map(
        (r, i) =>
          `${i + 1}. **${r.title}**${r.categoryName ? ` [${r.categoryName}]` : ""}\n   ${r.excerpt ?? ""}\n   Slug: ${r.slug}`
      )
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${data.results.length} result(s) for "${query}":\n\n${text}`,
        },
      ],
    };
  }
);

// ── Tool: list-categories ─────────────────────────────────────

server.tool(
  "list-categories",
  "List all knowledge base categories with article counts",
  {
    locale: z
      .enum(LOCALES)
      .default("en")
      .describe("Language: en, da, sv, or de"),
  },
  async ({ locale }) => {
    const data = await fetchJson<{
      categories: Array<{
        slug: string;
        name: string;
        description: string | null;
        articleCount: number;
        children: Array<{
          slug: string;
          name: string;
          description: string | null;
          articleCount: number;
        }>;
      }>;
    }>(`/api/public/categories?locale=${locale}`);

    const text = data.categories
      .map((cat) => {
        let line = `- **${cat.name}** (${cat.articleCount} articles) — slug: \`${cat.slug}\``;
        if (cat.description) line += `\n  ${cat.description}`;
        if (cat.children.length > 0) {
          line += cat.children
            .map(
              (child) =>
                `\n  - ${child.name} (${child.articleCount} articles) — slug: \`${child.slug}\``
            )
            .join("");
        }
        return line;
      })
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `Knowledge base categories (${locale}):\n\n${text}`,
        },
      ],
    };
  }
);

// ── Tool: list-articles ───────────────────────────────────────

server.tool(
  "list-articles",
  "List articles, optionally filtered by category slug",
  {
    category: z
      .string()
      .optional()
      .describe("Category slug to filter by (omit for all articles)"),
    locale: z
      .enum(LOCALES)
      .default("en")
      .describe("Language: en, da, sv, or de"),
  },
  async ({ category, locale }) => {
    const params = new URLSearchParams({ locale });
    if (category) params.set("category", category);

    const data = await fetchJson<{
      articles: Array<{
        slug: string;
        title: string;
        excerpt: string | null;
        category: { slug: string; name: string } | null;
        tags: string[];
        pinned: boolean;
      }>;
    }>(`/api/public/articles?${params}`);

    if (data.articles.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: category
              ? `No published articles in category "${category}" (${locale}).`
              : `No published articles found (${locale}).`,
          },
        ],
      };
    }

    const text = data.articles
      .map((a) => {
        let line = `- **${a.title}**${a.pinned ? " (pinned)" : ""}`;
        if (a.category) line += ` [${a.category.name}]`;
        if (a.excerpt) line += `\n  ${a.excerpt}`;
        if (a.tags.length > 0) line += `\n  Tags: ${a.tags.join(", ")}`;
        line += `\n  Slug: \`${a.slug}\``;
        return line;
      })
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `${data.articles.length} article(s)${category ? ` in "${category}"` : ""} (${locale}):\n\n${text}`,
        },
      ],
    };
  }
);

// ── Tool: get-article ─────────────────────────────────────────

server.tool(
  "get-article",
  "Read the full content of a specific article by its slug",
  {
    slug: z.string().describe("Article slug (from search or list-articles)"),
    locale: z
      .enum(LOCALES)
      .default("en")
      .describe("Language: en, da, sv, or de"),
  },
  async ({ slug, locale }) => {
    try {
      const data = await fetchJson<{
        slug: string;
        title: string;
        excerpt: string | null;
        content: string;
        category: { slug: string; name: string } | null;
        tags: string[];
        relatedArticles: Array<{ slug: string; title: string }>;
        publishedAt: string | null;
      }>(`/api/public/articles/${encodeURIComponent(slug)}?locale=${locale}`);

      let text = `# ${data.title}\n\n`;
      if (data.category) text += `Category: ${data.category.name}\n`;
      if (data.tags.length > 0) text += `Tags: ${data.tags.join(", ")}\n`;
      if (data.publishedAt)
        text += `Published: ${new Date(data.publishedAt).toLocaleDateString()}\n`;
      text += `\n---\n\n${data.content}`;

      if (data.relatedArticles.length > 0) {
        text += `\n\n---\n\n**Related articles:**\n`;
        text += data.relatedArticles
          .map((r) => `- ${r.title} (slug: \`${r.slug}\`)`)
          .join("\n");
      }

      return { content: [{ type: "text", text }] };
    } catch {
      return {
        content: [
          {
            type: "text",
            text: `Article "${slug}" not found in locale "${locale}".`,
          },
        ],
      };
    }
  }
);

// ── Tool: list-videos ─────────────────────────────────────────

server.tool(
  "list-videos",
  "List available video tutorials and walkthroughs",
  {
    locale: z
      .enum(LOCALES)
      .default("en")
      .describe("Language: en, da, sv, or de"),
  },
  async ({ locale }) => {
    const data = await fetchJson<{
      videos: Array<{
        slug: string;
        title: string;
        description: string | null;
        duration: string | null;
        pinned: boolean;
        isGated: boolean;
      }>;
    }>(`/api/public/videos?locale=${locale}`);

    if (data.videos.length === 0) {
      return {
        content: [
          { type: "text", text: `No videos available (${locale}).` },
        ],
      };
    }

    const text = data.videos
      .map((v) => {
        let line = `- **${v.title}**`;
        if (v.duration) line += ` (${v.duration})`;
        if (v.pinned) line += " [Featured]";
        if (v.isGated) line += " [Members only]";
        if (v.description) line += `\n  ${v.description}`;
        return line;
      })
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `${data.videos.length} video(s) available (${locale}):\n\n${text}`,
        },
      ],
    };
  }
);

// ── Start server ──────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP server error:", err);
  process.exit(1);
});
