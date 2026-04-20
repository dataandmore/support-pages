import { describe, it, expect } from "vitest"
import { parseDuration } from "@/lib/ffmpeg"

describe("parseDuration", () => {
  it("parses standard HH:MM:SS.ms format", () => {
    const stderr = "  Duration: 00:03:45.92, start: 0.000000, bitrate: 1234 kb/s"
    expect(parseDuration(stderr)).toBeCloseTo(225.92, 1)
  })

  it("parses hours correctly", () => {
    const stderr = "Duration: 01:00:00.00"
    expect(parseDuration(stderr)).toBe(3600)
  })

  it("parses short clips", () => {
    const stderr = "Duration: 00:00:12.34"
    expect(parseDuration(stderr)).toBeCloseTo(12.34, 1)
  })

  it("returns 0 when Duration is not present", () => {
    const stderr = "No duration information here"
    expect(parseDuration(stderr)).toBe(0)
  })

  it("returns 0 for empty string", () => {
    expect(parseDuration("")).toBe(0)
  })

  it("handles extra whitespace", () => {
    const stderr = "  Duration:  00:02:30.00  "
    expect(parseDuration(stderr)).toBe(150)
  })
})
