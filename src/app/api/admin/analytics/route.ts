import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const daysParam = searchParams.get("days")
  const days = daysParam === "all" ? null : parseInt(daysParam || "30", 10)
  const cutoff = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : new Date(0)
  const dateFilter = { createdAt: { gte: cutoff } }

  const [
    totalViews,
    uniqueVisitors,
    helpfulCount,
    unhelpfulCount,
    searchCount,
    topDomains,
    popularArticlesRaw,
    lowestRatedRaw,
    topSearchesRaw,
    zeroResultSearchesRaw,
    viewsByDayRaw,
    recentComments,
  ] = await Promise.all([
    // Total views
    prisma.pageView.count({ where: dateFilter }),

    // Unique visitors (distinct sessionHash)
    prisma.pageView.groupBy({
      by: ["sessionHash"],
      where: { ...dateFilter, sessionHash: { not: null } },
    }).then((r) => r.length),

    // Helpful feedback count
    prisma.articleFeedback.count({ where: { ...dateFilter, helpful: true } }),

    // Unhelpful feedback count
    prisma.articleFeedback.count({ where: { ...dateFilter, helpful: false } }),

    // Total searches
    prisma.searchQuery.count({ where: dateFilter }),

    // Top referrer domains
    prisma.pageView.groupBy({
      by: ["referrerDomain"],
      where: { ...dateFilter, referrerDomain: { not: null } },
      _count: { referrerDomain: true },
      orderBy: { _count: { referrerDomain: "desc" } },
      take: 10,
    }),

    // Most popular articles by views
    prisma.pageView.groupBy({
      by: ["articleId"],
      where: dateFilter,
      _count: { articleId: true },
      orderBy: { _count: { articleId: "desc" } },
      take: 10,
    }),

    // Articles with feedback for lowest-rated calc
    prisma.articleFeedback.groupBy({
      by: ["articleId"],
      where: dateFilter,
      _count: { id: true },
    }),

    // Top search queries
    prisma.searchQuery.groupBy({
      by: ["query"],
      where: dateFilter,
      _count: { query: true },
      _avg: { resultCount: true },
      orderBy: { _count: { query: "desc" } },
      take: 20,
    }),

    // Zero-result searches
    prisma.searchQuery.groupBy({
      by: ["query"],
      where: { ...dateFilter, resultCount: 0 },
      _count: { query: true },
      orderBy: { _count: { query: "desc" } },
      take: 10,
    }),

    // Views by day (raw SQL for date grouping)
    prisma.$queryRawUnsafe<{ date: string; views: bigint }[]>(
      `SELECT DATE("createdAt") as date, COUNT(*) as views
       FROM "PageView"
       WHERE "createdAt" >= $1
       GROUP BY DATE("createdAt")
       ORDER BY date ASC`,
      cutoff
    ),

    // Recent feedback comments
    prisma.articleFeedback.findMany({
      where: { ...dateFilter, comment: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        article: {
          include: {
            translations: { where: { locale: "en" }, take: 1 },
          },
        },
      },
    }),
  ])

  // Enrich popular articles with titles
  const articleIds = popularArticlesRaw.map((a) => a.articleId)
  const articles = await prisma.article.findMany({
    where: { id: { in: articleIds } },
    include: {
      translations: { where: { locale: "en" }, take: 1 },
    },
  })
  const articleMap = new Map(articles.map((a) => [a.id, a]))

  const popularArticles = popularArticlesRaw.map((a) => {
    const article = articleMap.get(a.articleId)
    return {
      articleId: a.articleId,
      slug: article?.slug ?? "",
      title: article?.translations[0]?.title ?? "Untitled",
      views: a._count.articleId,
    }
  })

  // Compute lowest rated articles (need feedback counts per article)
  const feedbackArticleIds = [...new Set(lowestRatedRaw.map((f) => f.articleId))]
  const feedbackDetails = await prisma.articleFeedback.groupBy({
    by: ["articleId", "helpful"],
    where: { ...dateFilter, articleId: { in: feedbackArticleIds } },
    _count: { id: true },
  })

  const feedbackMap = new Map<string, { helpful: number; unhelpful: number }>()
  feedbackDetails.forEach((f) => {
    const entry = feedbackMap.get(f.articleId) ?? { helpful: 0, unhelpful: 0 }
    if (f.helpful) entry.helpful = f._count.id
    else entry.unhelpful = f._count.id
    feedbackMap.set(f.articleId, entry)
  })

  const feedbackArticles = await prisma.article.findMany({
    where: { id: { in: feedbackArticleIds } },
    include: { translations: { where: { locale: "en" }, take: 1 } },
  })
  const feedbackArticleMap = new Map(feedbackArticles.map((a) => [a.id, a]))

  const lowestRated = Array.from(feedbackMap.entries())
    .map(([articleId, counts]) => {
      const total = counts.helpful + counts.unhelpful
      const article = feedbackArticleMap.get(articleId)
      return {
        articleId,
        slug: article?.slug ?? "",
        title: article?.translations[0]?.title ?? "Untitled",
        helpful: counts.helpful,
        unhelpful: counts.unhelpful,
        ratio: total > 0 ? Math.round((counts.helpful / total) * 100) : 0,
      }
    })
    .filter((a) => a.helpful + a.unhelpful >= 1)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 10)

  return NextResponse.json({
    totalViews,
    uniqueVisitors,
    feedbackCount: { helpful: helpfulCount, unhelpful: unhelpfulCount },
    searchCount,
    topDomains: topDomains.map((d) => ({
      domain: d.referrerDomain,
      count: d._count.referrerDomain,
    })),
    popularArticles,
    lowestRated,
    topSearches: topSearchesRaw.map((s) => ({
      query: s.query,
      count: s._count.query,
      avgResults: Math.round(s._avg.resultCount ?? 0),
    })),
    zeroResultSearches: zeroResultSearchesRaw.map((s) => ({
      query: s.query,
      count: s._count.query,
    })),
    viewsByDay: viewsByDayRaw.map((d) => ({
      date: String(d.date).substring(0, 10),
      views: Number(d.views),
    })),
    recentComments: recentComments.map((c) => ({
      articleTitle: c.article.translations[0]?.title ?? "Untitled",
      helpful: c.helpful,
      comment: c.comment,
      createdAt: c.createdAt.toISOString(),
    })),
  })
}
