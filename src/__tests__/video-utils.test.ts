import { describe, it, expect } from "vitest"

// ---------------------------------------------------------------------------
// Slug generation (mirrors the logic in /api/videos/route.ts)
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

describe("slugify", () => {
  it("converts basic filename to slug", () => {
    expect(slugify("My Video.mp4")).toBe("my-video")
  })

  it("strips file extension", () => {
    expect(slugify("intro.mov")).toBe("intro")
    expect(slugify("demo.webm")).toBe("demo")
    expect(slugify("tour.mkv")).toBe("tour")
  })

  it("handles multiple dots", () => {
    expect(slugify("my.video.file.mp4")).toBe("my-video-file")
  })

  it("replaces special characters with dashes", () => {
    expect(slugify("Hello World! (2024).mp4")).toBe("hello-world-2024")
  })

  it("trims leading and trailing dashes", () => {
    expect(slugify(" - test - .mp4")).toBe("test")
  })

  it("collapses multiple consecutive non-alphanumeric chars", () => {
    expect(slugify("hello   world.mp4")).toBe("hello-world")
  })

  it("handles all-numeric filename", () => {
    expect(slugify("2024.mp4")).toBe("2024")
  })
})

// ---------------------------------------------------------------------------
// Duration formatting (mirrors formatDuration in admin/videos/page.tsx)
// ---------------------------------------------------------------------------

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

describe("formatDuration", () => {
  it("formats zero as em-dash", () => {
    expect(formatDuration(0)).toBe("—")
  })

  it("formats null as em-dash", () => {
    expect(formatDuration(null)).toBe("—")
  })

  it("formats 90 seconds as 1:30", () => {
    expect(formatDuration(90)).toBe("1:30")
  })

  it("pads single-digit seconds with zero", () => {
    expect(formatDuration(65)).toBe("1:05")
  })

  it("handles exactly 1 minute", () => {
    expect(formatDuration(60)).toBe("1:00")
  })

  it("handles longer videos", () => {
    expect(formatDuration(3723)).toBe("62:03")
  })
})

// ---------------------------------------------------------------------------
// Stream path security (mirrors logic in /api/stream/[...path]/route.ts)
// ---------------------------------------------------------------------------

function isSafePath(segments: string[]): boolean {
  return !segments.some((seg) => seg.includes(".."))
}

describe("stream path security", () => {
  it("allows normal path segments", () => {
    expect(isSafePath(["videos", "hls", "abc123", "playlist.m3u8"])).toBe(true)
  })

  it("blocks path traversal with ..", () => {
    expect(isSafePath(["videos", "..", "etc", "passwd"])).toBe(false)
  })

  it("blocks encoded path traversal attempt", () => {
    expect(isSafePath(["videos", "..%2F..%2Fetc"])).toBe(false) // Note: actual URL decoding happens in Next.js
  })

  it("allows thumbnail paths", () => {
    expect(isSafePath(["videos", "thumbnails", "abc123.jpg"])).toBe(true)
  })

  it("allows image paths", () => {
    expect(isSafePath(["images", "uuid.png"])).toBe(true)
  })
})
