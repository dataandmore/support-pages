interface SynthesiaEmbedProps {
  videoId: string
  locale?: string
  className?: string
}

export function SynthesiaEmbed({ videoId, locale, className }: SynthesiaEmbedProps) {
  const localeParam = locale ? `?language=${locale}` : ""

  return (
    <iframe
      src={`https://share.synthesia.io/embeds/videos/${videoId}${localeParam}`}
      loading="lazy"
      title="Video"
      allow="encrypted-media; fullscreen"
      allowFullScreen
      style={{ border: "none" }}
      className={className ?? "w-full h-full"}
    />
  )
}
