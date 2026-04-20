import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Plus } from "lucide-react"
import { ArticlesSearchList, type ArticleRow } from "@/components/admin/ArticlesSearchList"

export default async function ArticlesPage() {
  const articles = await prisma.article.findMany({
    include: {
      translations: true,
      category: { include: { translations: { where: { locale: "en" } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  const rows: ArticleRow[] = articles.map((article) => {
    const enTranslation = article.translations.find((t) => t.locale === "en")
    return {
      id: article.id,
      slug: article.slug,
      title: enTranslation?.title ?? article.slug,
      category: article.category?.translations[0]?.name ?? "—",
      statuses: Object.fromEntries(
        (["en", "da", "sv", "de"] as const).map((loc) => [
          loc,
          article.translations.find((t) => t.locale === loc)?.status,
        ])
      ) as ArticleRow["statuses"],
    }
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
        <Link
          href="/admin/articles/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#EC6E1E] text-white text-sm font-medium rounded-lg hover:bg-[#d4601a] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New article
        </Link>
      </div>

      <ArticlesSearchList articles={rows} />
    </div>
  )
}
