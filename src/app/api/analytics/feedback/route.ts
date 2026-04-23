import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { hashSession } from "@/lib/analytics"

const schema = z.object({
  articleId: z.string(),
  locale: z.string(),
  helpful: z.boolean(),
  comment: z.string().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const { articleId, locale, helpful, comment } = parsed.data
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
    const userAgent = req.headers.get("user-agent") ?? "unknown"
    const sessionId = hashSession(ip, userAgent)

    // One feedback per session per article
    const existing = await prisma.articleFeedback.findFirst({
      where: { sessionHash: sessionId, articleId },
    })

    if (existing) {
      // Update existing feedback
      await prisma.articleFeedback.update({
        where: { id: existing.id },
        data: { helpful, comment: comment || null },
      })
    } else {
      await prisma.articleFeedback.create({
        data: {
          articleId,
          locale,
          helpful,
          comment: comment || null,
          sessionHash: sessionId,
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
