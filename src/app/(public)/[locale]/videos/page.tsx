import { prisma } from "@/lib/prisma"
import { isValidLocale, defaultLocale } from "@/lib/i18n"
import { Header } from "@/components/public/Header"
import { Footer } from "@/components/public/Footer"
import { VideoPlayer } from "@/components/public/VideoPlayer"
import { Lock, Clock } from "lucide-react"
import { auth } from "@/lib/auth"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Videos",
  description: "Watch tutorials and product walkthroughs from Data & More.",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDuration(seconds: number | null): string {
  if (!seconds) return ""
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function VideosPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const validLocale = isValidLocale(locale) ? locale : defaultLocale
  const session = await auth()
  const isAuthenticated = !!session

  const videos = await prisma.video.findMany({
    where: { status: "READY" },
    orderBy: { createdAt: "desc" },
    include: {
      translations: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { locale: validLocale as any },
      },
    },
  })

  const pageTitle: Record<string, string> = {
    en: "Video library",
    da: "Videobibliotek",
    sv: "Videobibliotek",
    de: "Videobibliothek",
  }

  const emptyLabel: Record<string, string> = {
    en: "No videos published yet.",
    da: "Ingen videoer udgivet endnu.",
    sv: "Inga videor publicerade ännu.",
    de: "Noch keine Videos veröffentlicht.",
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header locale={validLocale} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">
          {pageTitle[validLocale] ?? pageTitle.en}
        </h1>

        {videos.length === 0 ? (
          <p className="text-gray-500 text-sm py-16 text-center">
            {emptyLabel[validLocale] ?? emptyLabel.en}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => {
              const translation = video.translations[0]
              const title = translation?.title || video.originalFilename
              const description = translation?.description ?? null

              // Gated + unauthenticated: show locked card without player
              const locked = video.isGated && !isAuthenticated

              const hlsUrl = video.hlsPath
                ? `/api/stream/${video.hlsPath}/playlist.m3u8`
                : null

              const posterUrl = video.thumbnailPath
                ? `/api/stream/${video.thumbnailPath}`
                : undefined

              return (
                <article
                  key={video.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col"
                >
                  {/* Player or locked overlay */}
                  <div className="relative aspect-video bg-gray-900">
                    {locked || !hlsUrl ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
                        {posterUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={posterUrl}
                            alt={title}
                            className="absolute inset-0 w-full h-full object-cover opacity-40"
                          />
                        )}
                        {locked && (
                          <div className="relative z-10 flex flex-col items-center gap-2">
                            <Lock className="w-8 h-8 text-white/80" />
                            <a
                              href={`/${validLocale}/login?callbackUrl=/${validLocale}/videos`}
                              className="text-xs bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-1.5 rounded-full transition-colors"
                            >
                              Log in to watch
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <VideoPlayer src={hlsUrl} poster={posterUrl} className="w-full h-full" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h2 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
                        {title}
                      </h2>
                      {video.isGated && (
                        <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                          Members
                        </span>
                      )}
                    </div>
                    {description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">{description}</p>
                    )}
                    {video.duration && (
                      <div className="flex items-center gap-1 mt-auto pt-3 text-xs text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(video.duration)}
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
