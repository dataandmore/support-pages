import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { hashSession, extractDomain } from "@/lib/analytics"

const schema = z.object({
  articleId: z.string(),
  locale: z.string(),
  referrer: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const { articleId, locale, referrer } = parsed.data
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
    const userAgent = req.headers.get("user-agent") ?? "unknown"
    const sessionId = hashSession(ip, userAgent)
    const referrerDomain = extractDomain(referrer)

    // Dedup: skip if same session viewed same article in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const existing = await prisma.pageView.findFirst({
      where: {
        sessionHash: sessionId,
        articleId,
        createdAt: { gte: oneHourAgo },
      },
    })

    if (!existing) {
      await prisma.pageView.create({
        data: {
          articleId,
          locale,
          referrer: referrer || null,
          referrerDomain,
          userAgent,
          sessionHash: sessionId,
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
