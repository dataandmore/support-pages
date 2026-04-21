import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      translations: true,
      category: { include: { translations: true } },
      tags: { include: { tag: true } },
      relatedTo: { include: { relatedArticle: { include: { translations: true } } } },
    },
  })
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ article })
}

const UpdateTranslationSchema = z.object({
  locale: z.string(),
  title: z.string().min(1),
  content: z.any(),
  excerpt: z.string().optional(),
  status: z.enum(["DRAFT", "AI_DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"]),
})

const UpdateArticleSchema = z.object({
  categoryId: z.string().optional().nullable(),
  isGated: z.boolean().optional(),
  pinned: z.boolean().optional(),
  position: z.number().optional(),
  translation: UpdateTranslationSchema.optional(),
  tagNames: z.array(z.string()).optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = UpdateArticleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { translation, tagNames, ...articleData } = parsed.data

  // Handle tag updates if provided
  if (tagNames !== undefined) {
    // Delete existing tags
    await prisma.articleTag.deleteMany({ where: { articleId: id } })

    // Upsert tags and create associations
    for (const name of tagNames) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      if (!slug) continue
      const tag = await prisma.tag.upsert({
        where: { slug },
        create: { slug, name },
        update: {},
      })
      await prisma.articleTag.create({
        data: { articleId: id, tagId: tag.id },
      })
    }
  }

  // When archiving, cascade to ALL locale translations
  if (translation?.status === "ARCHIVED") {
    await prisma.articleTranslation.updateMany({
      where: { articleId: id },
      data: { status: "ARCHIVED" },
    })

    const article = await prisma.article.update({
      where: { id },
      data: articleData,
      include: { translations: true, tags: { include: { tag: true } } },
    })

    return NextResponse.json({ article })
  }

  const article = await prisma.article.update({
    where: { id },
    data: {
      ...articleData,
      ...(translation && {
        translations: {
          upsert: {
            where: {
              articleId_locale: {
                articleId: id,
                locale: translation.locale as "en" | "da" | "sv" | "de",
              },
            },
            create: {
              locale: translation.locale as "en" | "da" | "sv" | "de",
              title: translation.title,
              content: translation.content ?? {},
              excerpt: translation.excerpt,
              status: translation.status,
              ...(translation.status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
            },
            update: {
              title: translation.title,
              content: translation.content ?? {},
              excerpt: translation.excerpt,
              status: translation.status,
              ...(translation.status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
            },
          },
        },
      }),
    },
    include: { translations: true, tags: { include: { tag: true } } },
  })

  return NextResponse.json({ article })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  await prisma.article.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
