import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { sendUserInvite } from "@/lib/email"

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ users })
}

const InviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("EDITOR"),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json()
  const parsed = InviteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { email, name, role } = parsed.data
  const tempPassword = Math.random().toString(36).slice(-10) + "A1!"
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  const user = await prisma.user.create({
    data: { email, name, passwordHash, role: role as "ADMIN" | "EDITOR" | "VIEWER" },
    select: { id: true, email: true, name: true, role: true },
  })

  try {
    await sendUserInvite(email, name, tempPassword)
  } catch (e) {
    console.error("Failed to send invite email:", e)
  }

  return NextResponse.json({ user }, { status: 201 })
}

const UpdateSchema = z.object({
  userId: z.string(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const user = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role as "ADMIN" | "EDITOR" | "VIEWER" },
    select: { id: true, email: true, name: true, role: true },
  })
  return NextResponse.json({ user })
}
