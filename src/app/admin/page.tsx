import { prisma } from "@/lib/prisma"
import { FileText, CheckCircle, Clock, Languages } from "lucide-react"
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard"

async function getStats() {
  const [total, published, drafts, aiDrafts] = await Promise.all([
    prisma.articleTranslation.count(),
    prisma.articleTranslation.count({ where: { status: "PUBLISHED" } }),
    prisma.articleTranslation.count({ where: { status: "DRAFT" } }),
    prisma.articleTranslation.count({ where: { status: "AI_DRAFT" } }),
  ])
  return { total, published, drafts, aiDrafts }
}

export default async function AdminDashboard() {
  const stats = await getStats()

  const cards = [
    { label: "Total translations", value: stats.total, icon: FileText, color: "orange" },
    { label: "Published", value: stats.published, icon: CheckCircle, color: "green" },
    { label: "Drafts", value: stats.drafts, icon: Clock, color: "amber" },
    { label: "AI drafts (needs review)", value: stats.aiDrafts, icon: Languages, color: "purple" },
  ]

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Content stats */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Content</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">{card.label}</p>
                <card.icon className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/admin/articles/new" className="px-4 py-2 bg-[#EC6E1E] text-white text-sm font-medium rounded-lg hover:bg-[#d4601a] transition-colors">
            + New article
          </a>
          <a href="/admin/videos/upload" className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
            Upload video
          </a>
          <a href="/admin/categories" className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
            Manage categories
          </a>
        </div>
      </div>

      {/* Analytics */}
      <AnalyticsDashboard />
    </div>
  )
}
