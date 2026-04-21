import { prisma } from "@/lib/prisma"

export interface SearchResult {
  id: string
  slug: string
  title: string
  excerpt: string | null
  categorySlug: string | null
  categoryName: string | null
}

export async function searchArticles(
  query: string,
  locale: string
): Promise<SearchResult[]> {
  if (!query.trim()) return []

  // Use Prisma's full-text search capability via raw query
  const results = await prisma.$queryRaw<SearchResult[]>`
    SELECT
      a.id,
      a.slug,
      at2.title,
      at2.excerpt,
      c.slug AS "categorySlug",
      ct.name AS "categoryName"
    FROM "Article" a
    JOIN "ArticleTranslation" at2 ON at2."articleId" = a.id
    LEFT JOIN "Category" c ON c.id = a."categoryId"
    LEFT JOIN "CategoryTranslation" ct ON ct."categoryId" = c.id AND ct.locale = at2.locale
    WHERE
      at2.locale = ${locale}::"Locale"
      AND at2.status = 'PUBLISHED'
      AND (
        to_tsvector('simple', at2.title || ' ' || COALESCE(at2.excerpt, '') || ' ' || COALESCE((
          SELECT string_agg(t.name, ' ')
          FROM "ArticleTag" atg
          JOIN "Tag" t ON t.id = atg."tagId"
          WHERE atg."articleId" = a.id
        ), ''))
        @@ plainto_tsquery('simple', ${query})
      )
    ORDER BY
      ts_rank(
        to_tsvector('simple', at2.title || ' ' || COALESCE(at2.excerpt, '') || ' ' || COALESCE((
          SELECT string_agg(t.name, ' ')
          FROM "ArticleTag" atg
          JOIN "Tag" t ON t.id = atg."tagId"
          WHERE atg."articleId" = a.id
        ), '')),
        plainto_tsquery('simple', ${query})
      ) DESC
    LIMIT 20
  `

  return results
}
