"use client"

import { useEffect, useRef } from "react"

const VIDEOS = [
  "/hero-video.mp4",
  "/hero-video-2.mp4",
  "/hero-video-3.mp4",
  "/hero-video-4.mp4",
]

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Pick a random video on each page load
    const src = VIDEOS[Math.floor(Math.random() * VIDEOS.length)]
    const video = videoRef.current
    if (!video) return
    video.src = src
    video.load()
    video.play().catch(() => {/* autoplay blocked — overlay still shows */})
  }, [])

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 w-full h-full object-cover"
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
    />
  )
}
