"use client"

import Hls from "hls.js"
import { useEffect, useRef } from "react"

interface VideoPlayerProps {
  /** HLS playlist URL, e.g. /api/stream/videos/hls/{id}/playlist.m3u8 */
  src: string
  /** Thumbnail URL shown before playback starts */
  poster?: string
  className?: string
}

export function VideoPlayer({ src, poster, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: Hls | null = null

    if (Hls.isSupported()) {
      // Most browsers: use HLS.js
      hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari supports HLS natively
      video.src = src
    }

    return () => {
      hls?.destroy()
    }
  }, [src])

  return (
    <video
      ref={videoRef}
      poster={poster}
      controls
      playsInline
      className={className ?? "w-full rounded-lg aspect-video bg-black"}
    />
  )
}
