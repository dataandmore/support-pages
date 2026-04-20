import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import slugify from "slugify"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const categoryId = searchParams.get("categoryId")
  const locale = searchParams.get("locale") ?? "en"

  const articles = await prisma.article.findMany({
    where: {
      ...(categoryId ? { categoryId } : {}),
    },
    include: {
      translations: { where: { locale: locale as "en" | "da" | "sv" | "de" } },
      category: {
        include: { translations: { where: { locale: locale as "en" | "da" | "sv" | "de" } } },
      },
      _count: { select: { translations: true } },
    },
    orderBy: [{ categoryId: "asc" }, { position: "asc" }],
  })

  return NextResponse.json({ articles })
}

const CreateArticleSchema = z.object({
  categoryId: z.string().optional(),
  isGated: z.boolean().default(false),
  title: z.string().min(1),
  content: z.any(),
  excerpt: z.string().optional(),
  locale: z.string().default("en"),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = CreateArticleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { title, content, excerpt, locale, ...articleData } = parsed.data
  const baseSlug = slugify(title, { lower: true, strict: true })

  // Ensure unique slug
  let slug = baseSlug
  let counter = 1
  while (await prisma.article.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`
  }

  const article = await prisma.article.create({
    data: {
      ...articleData,
      slug,
      translations: {
        create: {
          locale: locale as "en" | "da" | "sv" | "de",
          title,
          content: content ?? {},
          excerpt,
          status: "DRAFT",
        },
      },
    },
    include: { translations: true },
  })

  return NextResponse.json({ article }, { status: 201 })
}
