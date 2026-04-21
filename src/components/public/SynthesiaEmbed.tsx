"use client"

interface SynthesiaEmbedProps {
  videoId: string
  className?: string
}

export function SynthesiaEmbed({ videoId, className }: SynthesiaEmbedProps) {
  return (
    <iframe
      src={`https://share.synthesia.io/embeds/videos/${videoId}`}
      loading="lazy"
      title="Video"
      allow="encrypted-media; fullscreen"
      allowFullScreen
      style={{ border: "none" }}
      className={className ?? "w-full h-full"}
    />
  )
}
