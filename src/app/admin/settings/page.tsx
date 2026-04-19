import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Settings" }

// ---------------------------------------------------------------------------
// Helper — check if an env var is set (non-empty)
// ---------------------------------------------------------------------------
function envStatus(key: string): "ok" | "missing" {
  const val = process.env[key]
  return val && val.trim() !== "" ? "ok" : "missing"
}

async function dbStatus(): Promise<"ok" | "missing"> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return "ok"
  } catch {
    return "missing"
  }
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: "ok" | "missing" }) {
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <CheckCircle className="w-3.5 h-3.5" /> Connected
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      <XCircle className="w-3.5 h-3.5" /> Not configured
    </span>
  )
}

interface ServiceRowProps {
  label: string
  description: string
  status: "ok" | "missing"
  envKey: string
}

function ServiceRow({ label, description, status, envKey }: ServiceRowProps) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        <code className="text-xs text-gray-400 font-mono">{envKey}</code>
      </div>
      <div className="ml-4 shrink-0">
        <StatusBadge status={status} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function SettingsPage() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/admin")

  const [db, articleCount, userCount, videoCount, mediaCount] = await Promise.all([
    dbStatus(),
    prisma.article.count(),
    prisma.user.count(),
    prisma.video.count(),
    prisma.media.count(),
  ])

  const services: ServiceRowProps[] = [
    {
      label: "Database",
      description: "PostgreSQL via Prisma",
      status: db,
      envKey: "DATABASE_URL",
    },
    {
      label: "Authentication secret",
      description: "NextAuth v5 JWT signing key",
      status: envStatus("AUTH_SECRET"),
      envKey: "AUTH_SECRET",
    },
    {
      label: "Postmark — transactional email",
      description: "User invitations, password resets",
      status: envStatus("POSTMARK_API_KEY"),
      envKey: "POSTMARK_API_KEY",
    },
    {
      label: "Anthropic Claude API",
      description: "AI article rewrites and bulk translation",
      status: envStatus("ANTHROPIC_API_KEY"),
      envKey: "ANTHROPIC_API_KEY",
    },
    {
      label: "HubSpot (legacy, read-only)",
      description: "Content migration scraper source",
      status: envStatus("HUBSPOT_API_KEY"),
      envKey: "HUBSPOT_API_KEY",
    },
  ]

  const stats = [
    { label: "Articles", value: articleCount },
    { label: "Users", value: userCount },
    { label: "Videos", value: videoCount },
    { label: "Media files", value: mediaCount },
  ]

  const nodeEnv = process.env.NODE_ENV ?? "unknown"
  const nextAuthUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "—"

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">
        System status and environment configuration for the support portal.
      </p>

      {/* Environment */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
          Environment
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-gray-400 mb-0.5">Mode</dt>
            <dd className="text-sm font-medium text-gray-900 capitalize">{nodeEnv}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 mb-0.5">Site URL</dt>
            <dd className="text-sm font-medium text-gray-900 truncate" title={nextAuthUrl}>
              {nextAuthUrl}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 mb-0.5">Node.js</dt>
            <dd className="text-sm font-medium text-gray-900">{process.version}</dd>
          </div>
        </dl>
      </section>

      {/* Content stats */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
          Content
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(({ label, value }) => (
            <div key={label} className="text-center bg-gray-50 rounded-xl py-4">
              <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1">
          Services &amp; integrations
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Configure these via environment variables on the server.
        </p>
        <div className="divide-y divide-gray-100">
          {services.map((svc) => (
            <ServiceRow key={svc.envKey} {...svc} />
          ))}
        </div>
      </section>

      {/* Migration scripts */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1">
          Content migration
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Run these commands from the project root to import HubSpot content.
        </p>
        <div className="space-y-2 font-mono text-xs text-gray-700">
          {[
            "npm run migrate:scrape   # scrape HubSpot articles to scripts/scraped/",
            "npm run migrate:import   # import scraped JSON into the database",
            "npm run migrate:rewrite  # rewrite articles with Claude AI",
            "npm run migrate:translate # translate to DA / SV / DE",
          ].map((cmd) => (
            <div key={cmd} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
              {cmd}
            </div>
          ))}
        </div>
      </section>

      {/* Info banner */}
      <div className="flex gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-[#d4601a]">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-orange-500" />
        <span>
          All configuration is managed via environment variables. Edit{" "}
          <code className="font-mono bg-orange-100 px-1 rounded">.env.local</code> on the server and
          restart the container to apply changes.
        </span>
      </div>
    </div>
  )
}
