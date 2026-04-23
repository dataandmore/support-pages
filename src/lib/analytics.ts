import { createHash } from "crypto"

export function hashSession(ip: string, userAgent: string): string {
  return createHash("sha256").update(`${ip}:${userAgent}`).digest("hex")
}

export function extractDomain(referrer: string | null | undefined): string | null {
  if (!referrer) return null
  try {
    return new URL(referrer).hostname
  } catch {
    return null
  }
}
