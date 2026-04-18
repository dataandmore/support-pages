import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { position: "asc" },
    include: {
      translations: true,
      _count: { select: { articles: true } },
    },
  })
  return NextResponse.json({ categories })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json()
  // body: { reorder: [{ id, position }] } or { id, ...updates }
  if (body.reorder) {
    await Promise.all(
      body.reorder.map(({ id, position }: { id: string; position: number }) =>
        prisma.category.update({ where: { id }, data: { position } })
      )
    )
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ error: "Invalid request" }, { status: 400 })
}
