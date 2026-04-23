"use client"

import { useState, useEffect } from "react"
import {
  Eye,
  Users,
  ThumbsUp,
  ThumbsDown,
  Search,
  AlertTriangle,
  MessageSquare,
  Globe,
  TrendingUp,
  BarChart3,
} from "lucide-react"

type AnalyticsData = {
  totalViews: number
  uniqueVisitors: number
  feedbackCount: { helpful: number; unhelpful: number }
  searchCount: number
  topDomains: { domain: string; count: number }[]
  popularArticles: { articleId: string; slug: string; title: string; views: number }[]
  lowestRated: { articleId: string; slug: string; title: string; helpful: number; unhelpful: number; ratio: number }[]
  topSearches: { query: string; count: number; avgResults: number }[]
  zeroResultSearches: { query: string; count: number }[]
  viewsByDay: { date: string; views: number }[]
  recentComments: { articleTitle: string; helpful: boolean; comment: string; createdAt: string }[]
}

const TIME_RANGES = [
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
  { label: "All time", value: "all" },
]

export function AnalyticsDashboard() {
  const [days, setDays] = useState("30")
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [days])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <BarChart3 className="w-5 h-5 animate-spin mr-2" />
        Loading analytics...
      </div>
    )
  }

  if (!data) return <p className="text-gray-500 py-10">Failed to load analytics.</p>

  const maxDayViews = Math.max(...data.viewsByDay.map((d) => d.views), 1)

  return (
    <div className="space-y-6">
      {/* Header with time range */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#EC6E1E]" />
          User Analytics
        </h2>
        <select
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:border-[#EC6E1E]"
        >
          {TIME_RANGES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Eye} label="Total Views" value={data.totalViews} />
        <StatCard icon={Users} label="Unique Visitors" value={data.uniqueVisitors} />
        <StatCard icon={ThumbsUp} label="Helpful" value={data.feedbackCount.helpful} color="green" />
        <StatCard icon={ThumbsDown} label="Not Helpful" value={data.feedbackCount.unhelpful} color="red" />
        <StatCard icon={Search} label="Searches" value={data.searchCount} />
      </div>

      {/* Views over time chart */}
      {data.viewsByDay.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Views Over Time</h3>
          <div className="flex items-end gap-[2px] h-32">
            {data.viewsByDay.map((day) => (
              <div
                key={day.date}
                className="flex-1 min-w-[3px] group relative"
                style={{ height: "100%" }}
              >
                <div
                  className="absolute bottom-0 w-full bg-[#EC6E1E] rounded-t-sm opacity-80 hover:opacity-100 transition-opacity"
                  style={{ height: `${(day.views / maxDayViews) * 100}%`, minHeight: day.views > 0 ? "2px" : "0" }}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap hidden group-hover:block z-10">
                  {day.date}: {day.views}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>{data.viewsByDay[0]?.date}</span>
            <span>{data.viewsByDay[data.viewsByDay.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Two-column: Popular Articles + Top Domains */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Articles */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#EC6E1E]" />
            Most Popular Articles
          </h3>
          {data.popularArticles.length === 0 ? (
            <p className="text-sm text-gray-400">No page views yet.</p>
          ) : (
            <div className="space-y-2">
              {data.popularArticles.map((article, i) => (
                <div key={article.articleId} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-300 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <a
                      href={`/admin/articles/${article.articleId}`}
                      className="text-sm text-gray-700 hover:text-[#EC6E1E] truncate block transition-colors"
                    >
                      {article.title}
                    </a>
                  </div>
                  <span className="text-sm font-medium text-gray-500 tabular-nums">{article.views}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Referrer Domains */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#EC6E1E]" />
            Top Referrer Domains
          </h3>
          {data.topDomains.length === 0 ? (
            <p className="text-sm text-gray-400">No referrer data yet.</p>
          ) : (
            <div className="space-y-2">
              {data.topDomains.map((domain) => {
                const pct = data.totalViews > 0 ? Math.round((domain.count / data.totalViews) * 100) : 0
                return (
                  <div key={domain.domain} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700 truncate">{domain.domain}</span>
                        <span className="text-xs text-gray-400 ml-2">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#EC6E1E] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-500 tabular-nums w-10 text-right">{domain.count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Two-column: Search Queries + Lowest Rated */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Search Queries */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Search className="w-4 h-4 text-[#EC6E1E]" />
            Top Search Queries
          </h3>
          {data.topSearches.length === 0 ? (
            <p className="text-sm text-gray-400">No searches yet.</p>
          ) : (
            <div className="space-y-2">
              {data.topSearches.map((s) => (
                <div key={s.query} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700 truncate block">&ldquo;{s.query}&rdquo;</span>
                  </div>
                  <span className="text-xs text-gray-400">{s.avgResults} results</span>
                  <span className="text-sm font-medium text-gray-500 tabular-nums">{s.count}x</span>
                </div>
              ))}
            </div>
          )}

          {data.zeroResultSearches.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-red-500 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Zero-Result Searches (content gaps)
              </h4>
              <div className="space-y-1">
                {data.zeroResultSearches.map((s) => (
                  <div key={s.query} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">&ldquo;{s.query}&rdquo;</span>
                    <span className="text-xs text-gray-400">{s.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lowest Rated Articles */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <ThumbsDown className="w-4 h-4 text-red-400" />
            Lowest Rated Articles
          </h3>
          {data.lowestRated.length === 0 ? (
            <p className="text-sm text-gray-400">No feedback yet.</p>
          ) : (
            <div className="space-y-3">
              {data.lowestRated.map((article) => (
                <div key={article.articleId}>
                  <a
                    href={`/admin/articles/${article.articleId}`}
                    className="text-sm text-gray-700 hover:text-[#EC6E1E] transition-colors line-clamp-1"
                  >
                    {article.title}
                  </a>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${article.ratio}%`,
                          backgroundColor: article.ratio >= 50 ? "#22c55e" : "#ef4444",
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {article.ratio}% ({article.helpful}/{article.helpful + article.unhelpful})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Feedback Comments */}
      {data.recentComments.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#EC6E1E]" />
            Recent Feedback Comments
          </h3>
          <div className="space-y-3">
            {data.recentComments.map((c, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className={`mt-0.5 p-1 rounded ${c.helpful ? "bg-green-50" : "bg-red-50"}`}>
                  {c.helpful ? (
                    <ThumbsUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <ThumbsDown className="w-3 h-3 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{c.comment}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    on <span className="font-medium">{c.articleTitle}</span>
                    {" · "}
                    {new Date(c.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  color?: "green" | "red"
}) {
  const iconColor = color === "green" ? "text-green-500" : color === "red" ? "text-red-500" : "text-gray-400"
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500">{label}</p>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value.toLocaleString()}</p>
    </div>
  )
}
