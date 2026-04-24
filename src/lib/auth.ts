import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

const ALLOWED_DOMAIN = "dataandmore.com"

const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(8),
          })
          .safeParse(credentials)

        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true,
          },
        })

        if (!user?.passwordHash) return null

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        )
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      // Google: only allow @dataandmore.com
      if (account?.provider === "google") {
        return !!user.email?.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)
      }
      // Credentials: authorize() already validated
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id

        if (account?.provider === "google") {
          // Google user: ensure ADMIN role for dataandmore.com
          const email = user.email?.toLowerCase() ?? ""
          if (email.endsWith(`@${ALLOWED_DOMAIN}`)) {
            await prisma.user.update({
              where: { id: user.id! },
              data: { role: "ADMIN" },
            })
            token.role = "ADMIN"
          }
        } else {
          // Credentials user: use role from DB
          token.role = (user as { role: string }).role
        }
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: "/en/login",
  },
  trustHost: true,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
