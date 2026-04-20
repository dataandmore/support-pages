import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const UpdateSchema = z.object({
  icon: z.string().optional(),
  isGated: z.boolean().optional(),
  translations: z
    .record(z.string(), z.object({ name: z.string(), description: z.string().optional() }))
    .optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { translations, ...data } = parsed.data
  const category = await prisma.category.update({
    where: { id },
    data: {
      ...data,
      ...(translations && {
        translations: {
          upsert: Object.entries(translations).map(([locale, t]) => ({
            where: {
              categoryId_locale: {
                categoryId: id,
                locale: locale as "en" | "da" | "sv" | "de",
              },
            },
            create: { locale: locale as "en" | "da" | "sv" | "de", ...t },
            update: t,
          })),
        },
      }),
    },
    include: { translations: true },
  })
  return NextResponse.json({ category })
}
