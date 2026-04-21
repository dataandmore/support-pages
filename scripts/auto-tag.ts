import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import Anthropic from "@anthropic-ai/sdk"

process.loadEnvFile(".env.local")

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
const anthropic = new Anthropic()

function extractText(content: unknown): string {
  if (!content) return ""
  if (typeof content === "string") return content

  function walk(node: unknown): string {
    if (!node || typeof node !== "object") return ""
    const n = node as Record<string, unknown>
    if (n.type === "text" && typeof n.text === "string") return n.text
    if (Array.isArray(n.content)) return n.content.map(walk).join(" ")
    if (Array.isArray(node)) return (node as unknown[]).map(walk).join(" ")
    return ""
  }

  return walk(content)
}

async function main() {
  const articles = await prisma.article.findMany({
    include: {
      translations: true,
      category: { include: { translations: { where: { locale: "en" } } } },
      tags: { include: { tag: true } },
    },
  })

  console.log(`Found ${articles.length} articles to analyze\n`)

  // Process in batches of 10
  const batchSize = 10
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize)

    const articleSummaries = batch.map((article) => {
      const enTranslation = article.translations.find((t) => t.locale === "en")
      const title = enTranslation?.title ?? article.slug
      const content = enTranslation ? extractText(enTranslation.content) : ""
      const category = article.category?.translations[0]?.name ?? "Uncategorized"
      return { id: article.id, title, content: content.slice(0, 1000), category }
    })

    const prompt = `Analyze these support articles and assign 2-5 relevant tags to each one.
Tags should be specific, lowercase, and useful for search (e.g., "active-directory", "gdpr", "file-shares", "azure", "security", "onboarding", "reports", "classification", "outlook", "teams", "data-retention", "permissions", "installation", "saas", "on-premise").

Articles:
${articleSummaries.map((a) => `ID: ${a.id}\nTitle: ${a.title}\nCategory: ${a.category}\nContent preview: ${a.content}\n`).join("\n---\n")}

Respond with ONLY a JSON object mapping article IDs to arrays of tag strings. No markdown, no explanation.
Example: {"id1": ["tag1", "tag2"], "id2": ["tag3", "tag4"]}`

    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articles.length / batchSize)}...`)

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    let tagMap: Record<string, string[]>
    try {
      tagMap = JSON.parse(text)
    } catch {
      console.error("Failed to parse response:", text)
      continue
    }

    // Save tags — only for article IDs that exist in this batch
    const validIds = new Set(articleSummaries.map((a) => a.id))
    for (const [articleId, tags] of Object.entries(tagMap)) {
      if (!Array.isArray(tags) || !validIds.has(articleId)) continue

      try {
        // Delete existing tags for this article
        await prisma.articleTag.deleteMany({ where: { articleId } })

        for (const name of tags) {
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
          if (!slug) continue

          const tag = await prisma.tag.upsert({
            where: { slug },
            create: { slug, name: name.toLowerCase() },
            update: {},
          })

          await prisma.articleTag.create({
            data: { articleId, tagId: tag.id },
          })
        }

        const article = articleSummaries.find((a) => a.id === articleId)
        console.log(`  ✓ ${article?.title ?? articleId}: ${tags.join(", ")}`)
      } catch (err) {
        console.error(`  ✗ Failed to tag ${articleId}:`, (err as Error).message)
      }
    }
  }

  // Summary
  const tagCount = await prisma.tag.count()
  const articleTagCount = await prisma.articleTag.count()
  console.log(`\n✅ Done! Created ${tagCount} unique tags across ${articleTagCount} article-tag associations.`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
