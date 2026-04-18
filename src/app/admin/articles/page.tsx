import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Plus, Edit } from "lucide-react"

const statusColors: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  IN_REVIEW: "bg-blue-100 text-blue-700",
  AI_DRAFT: "bg-purple-100 text-purple-700",
  DRAFT: "bg-gray-100 text-gray-600",
}

export default async function ArticlesPage() {
  const articles = await prisma.article.findMany({
    include: {
      translations: true,
      category: { include: { translations: { where: { locale: "en" } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
        <Link
          href="/admin/articles/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New article
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Title (EN)</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">EN</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">DA</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">SV</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">DE</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => {
              const enTranslation = article.translations.find((t) => t.locale === "en")
              const categoryName = article.category?.translations[0]?.name ?? "—"
              return (
                <tr key={article.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {enTranslation?.title ?? article.slug}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{categoryName}</td>
                  {(["en", "da", "sv", "de"] as const).map((loc) => {
                    const t = article.translations.find((tr) => tr.locale === loc)
                    return (
                      <td key={loc} className="px-4 py-3">
                        {t ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[t.status] ?? ""}`}
                          >
                            {t.status.replace("_", " ")}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/articles/${article.id}`}
                      className="p-1.5 rounded hover:bg-gray-200 inline-flex text-gray-500"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              )
            })}
            {articles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No articles yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
