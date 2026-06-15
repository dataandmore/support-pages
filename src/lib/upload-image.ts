/** Upload an image file to the media library. Returns the public URL. */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch("/api/media", { method: "POST", body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? "Upload failed")
  }

  const data = (await res.json()) as { media: { url: string } }
  return data.media.url
}
