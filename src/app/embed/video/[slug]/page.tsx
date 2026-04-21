import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { VideoPlayer } from "@/components/public/VideoPlayer"

export const dynamic = "force-dynamic"

export default async function VideoEmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const video = await prisma.video.findUnique({
    where: { slug },
  })

  if (!video || video.status !== "READY" || !video.hlsPath) {
    notFound()
  }

  if (video.isGated) {
    const session = await auth()
    if (!session) {
      return (
        <div className="w-screen h-screen bg-black text-white flex items-center justify-center text-sm px-4 text-center">
          Sign in to watch this video.
        </div>
      )
    }
  }

  const hlsUrl = `/api/stream/${video.hlsPath}`
  const poster = video.thumbnailPath
    ? `/api/stream/${video.thumbnailPath}`
    : undefined

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      <VideoPlayer
        src={hlsUrl}
        poster={poster}
        className="w-full h-full bg-black"
      />
    </div>
  )
}
