# Data & More Support Portal — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the HubSpot knowledge base at support.dataandmore.com with a self-hosted Next.js support portal on Hetzner, featuring a built-in multilingual CMS, rich content editing, self-hosted video hosting, gated content, and AI-assisted translations.

**Architecture:** Single Next.js 15 (App Router) monorepo — public-facing support site and `/admin` CMS dashboard in one deployment. PostgreSQL via Prisma handles all data. NextAuth v5 manages authentication and roles. FFmpeg processes uploaded videos into HLS streams. Claude AI drafts translations.

**Tech Stack:** Next.js 15, TypeScript, PostgreSQL, Prisma ORM, NextAuth v5, Tiptap (rich editor), Tailwind CSS, shadcn/ui, FFmpeg (video transcoding), HLS.js (video playback), Claude API (rewrites + translations), Postmark (transactional email), Docker + Docker Compose, Nginx, Let's Encrypt

**Staging:** `super.support.dataandmore.com` → production `support.dataandmore.com`

**Infrastructure sizing:** Hetzner CX31 (4 vCPU, 8GB RAM, 160GB SSD). ~50 videos at avg 500MB each ≈ 25GB video storage — fits comfortably on base disk. No separate volume needed initially.

---

## Objectives

1. **Public multilingual support site** — EN, DA, SV, DE with language persistence per session
2. **Role-based CMS** — Admin / Editor / Viewer roles, 3–10 team members
3. **Rich article editor** — Tiptap (Word-processor feel: tables, images, video embeds, formatting)
4. **Self-hosted video platform** — Upload → FFmpeg transcode → HLS stream + management UI
5. **AI translation workflow** — Claude drafts translations, editors review and publish
6. **Gated content** — Public articles + customer-only articles behind login
7. **Content migration** — Scrape all ~60 HubSpot articles, Claude fully rewrites and improves each one (structure, clarity, illustration suggestions), publishes as reviewed content ready for launch
8. **New IA** — Getting Started / IT Setup / Using the Platform / Organisation / Security / Operations / Video Library

---

## Phase 1: Project Scaffold & Infrastructure

### Task 1.1 — Init Next.js project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`
- Create: `.env.example`, `.gitignore`, `README.md`

**Steps:**

```bash
cd "/Users/davidjunge/Documents/claude-projects/support pages"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

Install additional dependencies:
```bash
npm install @prisma/client prisma next-auth@beta @auth/prisma-adapter
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-video @tiptap/extension-table @tiptap/extension-link @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-highlight @tiptap/extension-youtube
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast
npm install lucide-react clsx tailwind-merge class-variance-authority
npm install sharp slugify bcryptjs zod react-hook-form @hookform/resolvers
npm install hls.js
npm install @anthropic-ai/sdk
npm install -D @types/bcryptjs @types/node
```

Commit: `feat: init Next.js project with dependencies`

---

### Task 1.2 — Docker & PostgreSQL setup

**Files:**
- Create: `docker-compose.yml`
- Create: `docker-compose.prod.yml`
- Create: `Dockerfile`
- Create: `.env.local` (from .env.example, gitignored)

**docker-compose.yml** (development):
```yaml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: support_portal
      POSTGRES_USER: support_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://support_user:${POSTGRES_PASSWORD}@db:5432/support_portal
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - db

volumes:
  postgres_data:
```

**.env.example:**
```
DATABASE_URL=postgresql://support_user:password@localhost:5432/support_portal
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=your-anthropic-key
POSTGRES_PASSWORD=your-db-password
UPLOAD_DIR=./uploads
```

**Dockerfile:**
```dockerfile
FROM node:20-alpine AS base

RUN apk add --no-cache ffmpeg

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

Commit: `feat: add Docker and PostgreSQL setup`

---

### Task 1.3 — Prisma schema (full database)

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`

**prisma/schema.prisma:**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  EDITOR
  VIEWER
}

enum Locale {
  en
  da
  sv
  de
}

enum ArticleStatus {
  DRAFT
  AI_DRAFT
  IN_REVIEW
  PUBLISHED
}

enum VideoStatus {
  UPLOADING
  PROCESSING
  READY
  ERROR
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String?
  role          Role      @default(EDITOR)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  accounts      Account[]
  sessions      Session[]
  articles      ArticleTranslation[] @relation("TranslatedBy")
  reviewedArticles ArticleTranslation[] @relation("ReviewedBy")
  uploads       Media[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Category {
  id          String   @id @default(cuid())
  slug        String   @unique
  icon        String?
  position    Int      @default(0)
  isGated     Boolean  @default(false)
  parentId    String?
  parent      Category?  @relation("CategoryChildren", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryChildren")
  articles    Article[]
  translations CategoryTranslation[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CategoryTranslation {
  id          String   @id @default(cuid())
  categoryId  String
  locale      Locale
  name        String
  description String?
  category    Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  @@unique([categoryId, locale])
}

model Article {
  id           String   @id @default(cuid())
  slug         String   @unique
  categoryId   String?
  isGated      Boolean  @default(false)
  position     Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  category     Category? @relation(fields: [categoryId], references: [id])
  translations ArticleTranslation[]
  tags         ArticleTag[]
  relatedTo    RelatedArticle[] @relation("ArticleRelatedTo")
  relatedFrom  RelatedArticle[] @relation("ArticleRelatedFrom")
}

model ArticleTranslation {
  id           String        @id @default(cuid())
  articleId    String
  locale       Locale
  title        String
  content      Json
  excerpt      String?
  status       ArticleStatus @default(DRAFT)
  translatedBy String?
  reviewedBy   String?
  publishedAt  DateTime?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  article      Article       @relation(fields: [articleId], references: [id], onDelete: Cascade)
  translator   User?         @relation("TranslatedBy", fields: [translatedBy], references: [id])
  reviewer     User?         @relation("ReviewedBy", fields: [reviewedBy], references: [id])
  @@unique([articleId, locale])
}

model Tag {
  id       String       @id @default(cuid())
  slug     String       @unique
  name     String
  articles ArticleTag[]
}

model ArticleTag {
  articleId String
  tagId     String
  article   Article @relation(fields: [articleId], references: [id], onDelete: Cascade)
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@id([articleId, tagId])
}

model RelatedArticle {
  articleId        String
  relatedArticleId String
  article          Article @relation("ArticleRelatedTo", fields: [articleId], references: [id], onDelete: Cascade)
  relatedArticle   Article @relation("ArticleRelatedFrom", fields: [relatedArticleId], references: [id], onDelete: Cascade)
  @@id([articleId, relatedArticleId])
}

model Video {
  id               String      @id @default(cuid())
  slug             String      @unique
  filename         String
  originalFilename String
  size             BigInt
  duration         Float?
  status           VideoStatus @default(UPLOADING)
  thumbnailPath    String?
  hlsPath          String?
  isGated          Boolean     @default(false)
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  translations     VideoTranslation[]
}

model VideoTranslation {
  id          String @id @default(cuid())
  videoId     String
  locale      Locale
  title       String
  description String?
  video       Video  @relation(fields: [videoId], references: [id], onDelete: Cascade)
  @@unique([videoId, locale])
}

model Media {
  id               String   @id @default(cuid())
  filename         String   @unique
  originalFilename String
  mimetype         String
  size             Int
  url              String
  uploadedBy       String?
  createdAt        DateTime @default(now())
  uploader         User?    @relation(fields: [uploadedBy], references: [id])
}
```

Run migrations:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

Commit: `feat: add full Prisma schema`

---

### Task 1.4 — Project file structure

**Files to create:**
```
src/
├── app/
│   ├── (public)/           ← public-facing pages
│   │   ├── [locale]/
│   │   │   ├── page.tsx    ← homepage
│   │   │   ├── knowledge/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [categorySlug]/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [articleSlug]/
│   │   │   │   │       └── page.tsx
│   │   │   ├── videos/
│   │   │   │   └── page.tsx
│   │   │   └── search/
│   │   │       └── page.tsx
│   ├── admin/              ← CMS dashboard (auth required)
│   │   ├── layout.tsx
│   │   ├── page.tsx        ← dashboard
│   │   ├── articles/
│   │   │   ├── page.tsx    ← article list
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx    ← edit article
│   │   │       └── translations/page.tsx
│   │   ├── categories/
│   │   ├── videos/
│   │   │   ├── page.tsx
│   │   │   └── upload/page.tsx
│   │   ├── media/
│   │   ├── users/
│   │   └── settings/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── articles/route.ts
│   │   ├── categories/route.ts
│   │   ├── videos/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── stream/route.ts
│   │   ├── media/route.ts
│   │   ├── translate/route.ts
│   │   └── search/route.ts
│   └── layout.tsx
├── components/
│   ├── public/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── CategoryCard.tsx
│   │   ├── ArticleCard.tsx
│   │   ├── SearchBar.tsx
│   │   ├── LanguageSwitcher.tsx
│   │   ├── VideoPlayer.tsx
│   │   └── ArticleContent.tsx
│   └── admin/
│       ├── Sidebar.tsx
│       ├── RichEditor.tsx
│       ├── TranslationPanel.tsx
│       ├── VideoUploader.tsx
│       ├── MediaPicker.tsx
│       └── UserTable.tsx
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── i18n.ts
│   ├── translate.ts       ← Claude API translation
│   ├── video.ts           ← FFmpeg processing
│   └── search.ts
└── types/
    └── index.ts
```

Commit: `feat: scaffold project structure`

---

## Phase 2: Authentication & User Management

### Task 2.1 — NextAuth v5 setup

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/(public)/[locale]/login/page.tsx`

**src/lib/auth.ts:**
```typescript
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(8),
        }).safeParse(credentials)

        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })

        if (!user?.passwordHash) return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as any).role
      return token
    },
    session({ session, token }) {
      if (session.user) session.user.role = token.role as any
      return session
    },
  },
  pages: {
    signIn: "/en/login",
  },
})
```

**src/lib/prisma.ts:**
```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

**Middleware for admin protection:**

Create `src/middleware.ts`:
```typescript
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin")
  if (isAdminRoute && !req.auth) {
    return NextResponse.redirect(new URL("/en/login", req.url))
  }
})

export const config = {
  matcher: ["/admin/:path*"],
}
```

Commit: `feat: add NextAuth v5 with credentials + role JWT`

---

### Task 2.2 — Seed admin user + categories

**Files:**
- Modify: `prisma/seed.ts`

```typescript
import { PrismaClient, Role, Locale } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const categories = [
  { slug: "getting-started", icon: "🚀", position: 0, translations: {
    en: { name: "Getting Started", description: "New customers, PoC/Trial, first steps" },
    da: { name: "Kom godt i gang", description: "Nye kunder, PoC/prøveperiode, første skridt" },
    sv: { name: "Kom igång", description: "Nya kunder, PoC/provperiod, första steg" },
    de: { name: "Erste Schritte", description: "Neukunden, PoC/Test, erste Schritte" },
  }},
  { slug: "it-setup-onboarding", icon: "🔧", position: 1, translations: {
    en: { name: "IT Setup & Onboarding", description: "For IT admins: SaaS and on-premise setup" },
    da: { name: "IT-opsætning & onboarding", description: "Til IT-administratorer: SaaS og on-premise" },
    sv: { name: "IT-installation & onboarding", description: "För IT-administratörer: SaaS och on-premise" },
    de: { name: "IT-Einrichtung & Onboarding", description: "Für IT-Admins: SaaS und On-Premise" },
  }},
  { slug: "using-the-platform", icon: "📊", position: 2, translations: {
    en: { name: "Using the Platform", description: "Dashboard, reports, classification, clean-up flows" },
    da: { name: "Brug af platformen", description: "Dashboard, rapporter, klassifikation, oprydningsforløb" },
    sv: { name: "Använda plattformen", description: "Dashboard, rapporter, klassificering, rensningsflöden" },
    de: { name: "Plattform nutzen", description: "Dashboard, Berichte, Klassifizierung, Bereinigungsabläufe" },
  }},
  { slug: "organisation-rollout", icon: "🏢", position: 3, translations: {
    en: { name: "Organisation & Roll-out", description: "Project planning, templates, meeting agendas" },
    da: { name: "Organisation & udrulning", description: "Projektplanlægning, skabeloner, mødeagendaer" },
    sv: { name: "Organisation & utrullning", description: "Projektplanering, mallar, mötesdagordningar" },
    de: { name: "Organisation & Rollout", description: "Projektplanung, Vorlagen, Tagesordnungen" },
  }},
  { slug: "security-compliance", icon: "🔒", position: 4, isGated: true, translations: {
    en: { name: "Security & Compliance", description: "Security framework, CIS 18, GDPR" },
    da: { name: "Sikkerhed & compliance", description: "Sikkerhedsramme, CIS 18, GDPR" },
    sv: { name: "Säkerhet & efterlevnad", description: "Säkerhetsramverk, CIS 18, GDPR" },
    de: { name: "Sicherheit & Compliance", description: "Sicherheitsrahmen, CIS 18, DSGVO" },
  }},
  { slug: "operations-updates", icon: "🔄", position: 5, translations: {
    en: { name: "Operations & Updates", description: "Release notes and maintenance" },
    da: { name: "Drift & opdateringer", description: "Udgivelsesnoter og vedligeholdelse" },
    sv: { name: "Drift & uppdateringar", description: "Versionsanteckningar och underhåll" },
    de: { name: "Betrieb & Updates", description: "Versionshinweise und Wartung" },
  }},
  { slug: "video-library", icon: "🎬", position: 6, translations: {
    en: { name: "Video Library", description: "All product videos, events, and introductions" },
    da: { name: "Videobibliotek", description: "Alle produktvideoer, events og introduktioner" },
    sv: { name: "Videobibliotek", description: "Alla produktvideor, evenemang och introduktioner" },
    de: { name: "Videobibliothek", description: "Alle Produktvideos, Veranstaltungen und Einführungen" },
  }},
]

async function main() {
  const passwordHash = await bcrypt.hash("changeme123!", 12)
  await prisma.user.upsert({
    where: { email: "dj@dataandmore.com" },
    update: {},
    create: { email: "dj@dataandmore.com", name: "David Jung", passwordHash, role: Role.ADMIN },
  })

  for (const cat of categories) {
    const { translations, ...data } = cat
    const category = await prisma.category.upsert({
      where: { slug: data.slug },
      update: data,
      create: data,
    })
    for (const [locale, t] of Object.entries(translations)) {
      await prisma.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: category.id, locale: locale as Locale } },
        update: t,
        create: { categoryId: category.id, locale: locale as Locale, ...t },
      })
    }
  }
  console.log("✅ Seed complete")
}

main().then(() => prisma.$disconnect())
```

Run: `npx prisma db seed`

Commit: `feat: seed admin user and 7 categories with all 4 locale translations`

---

### Task 2.3 — Postmark transactional email

**Files:**
- Create: `src/lib/email.ts`

```bash
npm install postmark
```

**src/lib/email.ts:**
```typescript
import { ServerClient } from "postmark"

const client = new ServerClient(process.env.POSTMARK_API_KEY!)

export async function sendUserInvite(to: string, name: string, tempPassword: string) {
  await client.sendEmailWithTemplate({
    From: "support@dataandmore.com",
    To: to,
    TemplateAlias: "user-invite",
    TemplateModel: {
      name,
      temp_password: tempPassword,
      login_url: `${process.env.NEXTAUTH_URL}/en/login`,
      product_name: "Data & More Support Portal",
    },
  })
}

export async function sendPasswordReset(to: string, resetUrl: string) {
  await client.sendEmailWithTemplate({
    From: "support@dataandmore.com",
    To: to,
    TemplateAlias: "password-reset",
    TemplateModel: {
      reset_url: resetUrl,
      product_name: "Data & More Support Portal",
    },
  })
}
```

Add to `.env.example`: `POSTMARK_API_KEY=your-postmark-key`

Create two Postmark templates in dashboard: `user-invite` and `password-reset`.

Commit: `feat: Postmark email for user invites and password resets`

---

## Phase 3: Public-Facing Site

### Task 3.1 — i18n setup & routing

**Files:**
- Create: `src/lib/i18n.ts`
- Create: `src/app/(public)/[locale]/layout.tsx`

**src/lib/i18n.ts:**
```typescript
export const locales = ["en", "da", "sv", "de"] as const
export type Locale = typeof locales[number]

export const defaultLocale: Locale = "en"

export const localeNames: Record<Locale, string> = {
  en: "English",
  da: "Dansk",
  sv: "Svenska",
  de: "Deutsch",
}

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale)
}
```

Middleware to redirect `/` → `/en`:
```typescript
// add to src/middleware.ts
if (req.nextUrl.pathname === "/") {
  return NextResponse.redirect(new URL("/en", req.url))
}
```

Commit: `feat: i18n routing with 4 locales`

---

### Task 3.2 — Homepage (category grid)

**Files:**
- Create: `src/app/(public)/[locale]/page.tsx`
- Create: `src/components/public/CategoryCard.tsx`
- Create: `src/components/public/Header.tsx`
- Create: `src/components/public/Footer.tsx`
- Create: `src/components/public/SearchBar.tsx`

The homepage shows:
- Header with logo, language switcher, login button, search
- Hero with prominent search bar
- Grid of 7 category cards (icon, name, description, article count)
- Footer with copyright, company link

**src/app/(public)/[locale]/page.tsx:**
```typescript
import { prisma } from "@/lib/prisma"
import { isValidLocale, defaultLocale } from "@/lib/i18n"
import { CategoryCard } from "@/components/public/CategoryCard"
import { Header } from "@/components/public/Header"
import { SearchBar } from "@/components/public/SearchBar"

export default async function HomePage({ params }: { params: { locale: string } }) {
  const locale = isValidLocale(params.locale) ? params.locale : defaultLocale

  const categories = await prisma.category.findMany({
    orderBy: { position: "asc" },
    include: {
      translations: { where: { locale } },
      _count: { select: { articles: true } },
    },
  })

  return (
    <main>
      <Header locale={locale} />
      <section className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-20 px-6 text-center">
        <h1 className="text-4xl font-bold mb-4">How can we help?</h1>
        <SearchBar locale={locale} />
      </section>
      <section className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <CategoryCard key={cat.id} category={cat} locale={locale} />
        ))}
      </section>
    </main>
  )
}
```

Commit: `feat: homepage with category grid`

---

### Task 3.3 — Category & Article pages

**Files:**
- Create: `src/app/(public)/[locale]/knowledge/[categorySlug]/page.tsx`
- Create: `src/app/(public)/[locale]/knowledge/[categorySlug]/[articleSlug]/page.tsx`
- Create: `src/components/public/ArticleContent.tsx`
- Create: `src/components/public/ArticleCard.tsx`

Article page features:
- Breadcrumb navigation
- Article content rendered from Tiptap JSON
- Related articles sidebar
- Table of contents (auto-generated from headings)
- Gated content check (redirect to login if not authenticated)

**Gated content check in article page:**
```typescript
const session = await auth()
if (article.isGated && !session) {
  redirect(`/${locale}/login?callbackUrl=/${locale}/knowledge/${categorySlug}/${articleSlug}`)
}
```

Commit: `feat: category and article public pages with gated content`

---

### Task 3.4 — Search

**Files:**
- Create: `src/app/api/search/route.ts`
- Create: `src/app/(public)/[locale]/search/page.tsx`
- Create: `src/lib/search.ts`

Use PostgreSQL full-text search:
```typescript
// src/lib/search.ts
export async function searchArticles(query: string, locale: string) {
  return prisma.$queryRaw`
    SELECT
      a.id, a.slug, at.title, at.excerpt, c.slug as "categorySlug",
      ts_rank(to_tsvector('english', at.title || ' ' || at.excerpt), plainto_tsquery(${query})) as rank
    FROM "Article" a
    JOIN "ArticleTranslation" at ON at."articleId" = a.id
    JOIN "Category" c ON c.id = a."categoryId"
    WHERE
      at.locale = ${locale}::\"Locale\"
      AND at.status = 'PUBLISHED'
      AND to_tsvector('english', at.title || ' ' || at.excerpt) @@ plainto_tsquery(${query})
    ORDER BY rank DESC
    LIMIT 20
  `
}
```

Commit: `feat: PostgreSQL full-text search`

---

### Task 3.5 — Language switcher & locale persistence

**Files:**
- Create: `src/components/public/LanguageSwitcher.tsx`

The switcher replaces the locale segment in the current URL, so the user stays on the same article in their chosen language. Store preference in cookie.

```typescript
"use client"
import { useRouter, usePathname } from "next/navigation"
import { locales, localeNames } from "@/lib/i18n"

export function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter()
  const pathname = usePathname()

  function switchLocale(newLocale: string) {
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`)
    router.push(newPath)
  }

  return (
    <select value={currentLocale} onChange={(e) => switchLocale(e.target.value)}
      className="bg-transparent border border-white/30 rounded px-2 py-1 text-sm">
      {locales.map((l) => (
        <option key={l} value={l}>{localeNames[l]}</option>
      ))}
    </select>
  )
}
```

Commit: `feat: language switcher with locale persistence`

---

## Phase 4: CMS Admin Dashboard

### Task 4.1 — Admin layout & sidebar

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/components/admin/Sidebar.tsx`
- Create: `src/app/admin/page.tsx`

Admin layout wraps all `/admin/*` routes. Sidebar navigation:
- Dashboard
- Articles
- Categories
- Videos
- Media Library
- Users (admin only)
- Settings

**src/app/admin/layout.tsx:**
```typescript
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/admin/Sidebar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/en/login")

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role={session.user.role} />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}
```

Dashboard shows: total articles, published articles, draft articles, pending translations, recent activity.

Commit: `feat: admin layout with sidebar and dashboard stats`

---

### Task 4.2 — Tiptap rich editor component

**Files:**
- Create: `src/components/admin/RichEditor.tsx`

This is the core content editor. Features:
- Bold, italic, underline, strikethrough
- Headings H1-H3
- Ordered and unordered lists
- Tables (insert, add/remove rows/columns)
- Images (upload via media picker, or paste URL)
- YouTube / Vimeo embed (paste link)
- Self-hosted video embed
- Links
- Text alignment
- Highlight
- Code blocks
- Horizontal rule
- Undo/redo

```typescript
"use client"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import Link from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Youtube from "@tiptap/extension-youtube"
import { EditorToolbar } from "./EditorToolbar"

interface RichEditorProps {
  content: any
  onChange: (content: any) => void
  onImageUpload?: (file: File) => Promise<string>
}

export function RichEditor({ content, onChange, onImageUpload }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      Link.configure({ openOnClick: false }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      Youtube.configure({ controls: true }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  })

  return (
    <div className="border rounded-lg overflow-hidden">
      <EditorToolbar editor={editor} onImageUpload={onImageUpload} />
      <EditorContent editor={editor} className="prose max-w-none p-6 min-h-96 focus:outline-none" />
    </div>
  )
}
```

Commit: `feat: Tiptap rich editor with full toolbar`

---

### Task 4.3 — Article management (list, create, edit)

**Files:**
- Create: `src/app/admin/articles/page.tsx`
- Create: `src/app/admin/articles/new/page.tsx`
- Create: `src/app/admin/articles/[id]/page.tsx`
- Create: `src/app/api/articles/route.ts`
- Create: `src/app/api/articles/[id]/route.ts`

Article editor page layout:
- Left: Tiptap editor (main content)
- Right panel: Category selector, status, isGated toggle, position, tags, related articles, SEO (excerpt)
- Top: Title input, locale tabs (EN | DA | SV | DE)
- Bottom: Save draft / Publish buttons

Each locale tab shows:
- Title field
- Content (Tiptap)
- Excerpt
- Status badge (draft / ai_draft / in_review / published)
- "Generate AI Translation" button (if not English)

Commit: `feat: article CRUD with locale tabs and status management`

---

### Task 4.4 — AI translation workflow

**Files:**
- Create: `src/lib/translate.ts`
- Create: `src/app/api/translate/route.ts`

**src/lib/translate.ts:**
```typescript
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

const localeInstructions: Record<string, string> = {
  da: "Translate the following support article content to Danish. Use formal Danish suitable for enterprise software documentation.",
  sv: "Translate the following support article content to Swedish. Use formal Swedish suitable for enterprise software documentation.",
  de: "Translate the following support article content to German. Use formal German (Sie-form) suitable for enterprise software documentation.",
}

export async function translateArticle(
  title: string,
  content: any,
  targetLocale: string
): Promise<{ title: string; content: any; excerpt: string }> {
  const instruction = localeInstructions[targetLocale]
  if (!instruction) throw new Error(`Unsupported locale: ${targetLocale}`)

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: `${instruction}

Return a JSON object with keys: "title" (translated title), "content" (translated Tiptap JSON, keep structure identical), "excerpt" (1-2 sentence summary in target language).

Title: ${title}
Content (Tiptap JSON): ${JSON.stringify(content)}`
    }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("No JSON in translation response")
  return JSON.parse(jsonMatch[0])
}
```

The `/api/translate` route accepts `{ articleId, targetLocale }`, calls `translateArticle()`, saves result with status `AI_DRAFT`, returns the translation. Editors then review and edit before publishing.

Commit: `feat: AI translation via Claude API with editable draft status`

---

### Task 4.5 — Category management

**Files:**
- Create: `src/app/admin/categories/page.tsx`
- Create: `src/app/api/categories/route.ts`
- Create: `src/app/api/categories/[id]/route.ts`

Drag-and-drop reordering using native HTML5 drag API. Each category row shows: icon, name (EN), article count, isGated toggle, edit button. Edit modal has tabs for each locale (name + description per locale).

Commit: `feat: category management with drag-to-reorder and locale editing`

---

### Task 4.6 — User management (admin only)

**Files:**
- Create: `src/app/admin/users/page.tsx`
- Create: `src/app/api/users/route.ts`

Admin-only page. Table shows: name, email, role badge, last login, actions (edit role, reset password, deactivate). Invite new user by email (generates temporary password, sends email notification).

Roles:
- **Admin** — full access to all CMS features + user management
- **Editor** — can create/edit articles, manage translations, upload videos/media
- **Viewer** — read-only access to CMS (can see drafts, but not edit)

Commit: `feat: user management with role assignment (admin only)`

---

## Phase 5: Video Platform

### Task 5.1 — Video upload API with FFmpeg transcoding

**Files:**
- Create: `src/app/api/videos/route.ts`
- Create: `src/lib/video.ts`

**src/lib/video.ts:**
```typescript
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs/promises"

const execAsync = promisify(exec)

export async function transcodeToHLS(inputPath: string, outputDir: string): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true })
  const command = `ffmpeg -i "${inputPath}" \
    -c:v h264 -c:a aac \
    -hls_time 10 \
    -hls_playlist_type vod \
    -hls_segment_filename "${outputDir}/segment%03d.ts" \
    "${outputDir}/playlist.m3u8"`
  await execAsync(command)
}

export async function generateThumbnail(inputPath: string, outputPath: string): Promise<void> {
  const command = `ffmpeg -i "${inputPath}" -ss 00:00:03 -vframes 1 -q:v 2 "${outputPath}"`
  await execAsync(command)
}

export async function getVideoDuration(inputPath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`
  )
  return parseFloat(stdout.trim())
}
```

Upload flow:
1. Client uploads to `/api/videos` (multipart)
2. Save original file to `uploads/videos/originals/`
3. Create DB record with `PROCESSING` status
4. Kick off async FFmpeg transcode to `uploads/videos/hls/{id}/`
5. Generate thumbnail
6. Update DB record to `READY` with `hlsPath` and `thumbnailPath`

Commit: `feat: video upload with async FFmpeg HLS transcoding`

---

### Task 5.2 — Video streaming endpoint

**Files:**
- Create: `src/app/api/videos/[id]/stream/route.ts`

Serves HLS playlist and segments. Checks gated status.

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import fs from "fs"
import path from "path"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const video = await prisma.video.findUnique({ where: { id: params.id } })
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (video.isGated) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const file = req.nextUrl.searchParams.get("file") ?? "playlist.m3u8"
  const filePath = path.join(process.cwd(), "uploads/videos/hls", params.id, file)
  const stream = fs.createReadStream(filePath)
  const contentType = file.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t"

  return new NextResponse(stream as any, { headers: { "Content-Type": contentType } })
}
```

Commit: `feat: HLS video streaming endpoint with gated content support`

---

### Task 5.3 — Video management UI

**Files:**
- Create: `src/app/admin/videos/page.tsx`
- Create: `src/app/admin/videos/upload/page.tsx`
- Create: `src/components/admin/VideoUploader.tsx`
- Create: `src/components/public/VideoPlayer.tsx`

**VideoUploader** shows drag-and-drop zone, progress bar, and after upload: title/description fields per locale, isGated toggle.

**VideoPlayer** wraps HLS.js with native fallback:
```typescript
"use client"
import { useEffect, useRef } from "react"
import Hls from "hls.js"

export function VideoPlayer({ videoId, poster }: { videoId: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const src = `/api/videos/${videoId}/stream`

  useEffect(() => {
    if (!videoRef.current) return
    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(videoRef.current)
      return () => hls.destroy()
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = src
    }
  }, [src])

  return (
    <video ref={videoRef} controls poster={poster}
      className="w-full rounded-xl shadow-lg aspect-video bg-black" />
  )
}
```

Video library page: grid of video thumbnails, search by title, filter by locale, status badge (Processing / Ready), edit metadata, delete.

Commit: `feat: video management UI with upload, HLS player, and metadata editing`

---

## Phase 6: Media Library

### Task 6.1 — Image upload & media library

**Files:**
- Create: `src/app/admin/media/page.tsx`
- Create: `src/app/api/media/route.ts`
- Create: `src/components/admin/MediaPicker.tsx`

Media library: grid of uploaded images, upload button, search by filename. Used by Tiptap editor for image insertion.

Upload: POST to `/api/media` (multipart), save to `uploads/media/`, resize with Sharp to max 2000px wide, store path in DB, return URL.

MediaPicker is a modal opened from the Tiptap toolbar — browse/search existing media or upload new. Click to insert into editor.

Commit: `feat: media library with image upload, Sharp resize, and picker modal`

---

## Phase 7: Content Migration

### Task 7.1 — HubSpot content scraper

**Files:**
- Create: `scripts/scrape-hubspot.ts`

Scrapes all articles from `support.dataandmore.com/en/knowledge` and saves them as JSON.

```typescript
// scripts/scrape-hubspot.ts
// Run: npx ts-node scripts/scrape-hubspot.ts

const BASE_URL = "https://support.dataandmore.com/en/knowledge"

const CATEGORIES = [
  "organisational-roll-out",
  "it-onboarding",
  "data-sources",
  "compliance-server-how-to-videos",
  "security-compliance",
  "operations-updates",
  "data-more-videos",
]

// Fetch each category index, extract article URLs
// Fetch each article, extract title + HTML content
// Save to scripts/scraped-content/{category}/{slug}.json
// Format: { title, content (HTML), originalUrl, scrapedAt }
```

Output: `scripts/scraped-content/` — one JSON file per article.

Commit: `feat: HubSpot content scraper`

---

### Task 7.2 — Import scraped content into DB

**Files:**
- Create: `scripts/import-content.ts`

Reads scraped JSON files, converts HTML to Tiptap JSON (using `html-to-tiptap` or manual parsing), maps to new category structure, creates Article + ArticleTranslation records with `status: DRAFT`.

```bash
npm install html-to-tiptap
npx ts-node scripts/import-content.ts
```

Commit: `feat: import scraped HubSpot content as draft articles`

---

### Task 7.3 — Claude full article rewrite

**Files:**
- Create: `scripts/rewrite-articles.ts`

Claude rewrites every imported EN draft — improving structure, clarity, headings, and adding `<!-- ILLUSTRATION: description -->` comments where visuals would help. Updates article with `status: IN_REVIEW`.

```typescript
// src/lib/rewrite.ts
export async function rewriteArticle(title: string, content: any): Promise<{ title: string; content: any; excerpt: string }> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: `You are a technical writer for Data & More, a B2B GDPR compliance software company.

Rewrite the following support article to be clearer, better structured, and more helpful for enterprise customers.

Rules:
- Keep all factual information (do not invent features)
- Improve headings, add logical subheadings where missing
- Use short paragraphs and numbered steps for procedures
- Add <!-- ILLUSTRATION: [description] --> comments where a screenshot or diagram would help
- Write a 1-2 sentence excerpt for the article listing page
- Return valid JSON: { "title": string, "content": TiptapJSON, "excerpt": string }

Original title: ${title}
Original content: ${JSON.stringify(content)}`
    }],
  })
  // parse and return JSON
}
```

Process in batches of 3 with 3s delay (Claude rate limits).

Commit: `feat: Claude rewrites all imported articles with illustration markers`

---

### Task 7.4 — Bulk AI translation of rewritten articles

**Files:**
- Create: `scripts/translate-all.ts`

Iterates all rewritten English articles (`IN_REVIEW` status), calls `translateArticle()` for each missing DA/SV/DE translation, saves with `AI_DRAFT` status. Rate-limited to avoid API throttling.

```typescript
// Process in batches of 5, with 2s delay between batches
for (let i = 0; i < articles.length; i += 5) {
  const batch = articles.slice(i, i + 5)
  await Promise.all(batch.map(translateArticleAllLocales))
  if (i + 5 < articles.length) await sleep(2000)
}
```

Commit: `feat: bulk AI translation of all rewritten articles`

---

## Phase 8: UI/UX Polish

### Task 8.1 — Design system (tokens, typography, colors)

**Files:**
- Modify: `tailwind.config.ts`
- Create: `src/app/globals.css`

Brand colors from Data & More (dark blue primary, clean whites, subtle grays). Typography: Inter for UI, slightly larger body text for readability. Component variants via `class-variance-authority`.

```typescript
// tailwind.config.ts additions
theme: {
  extend: {
    colors: {
      brand: {
        50: "#eff6ff",
        100: "#dbeafe",
        500: "#3b82f6",
        700: "#1d4ed8",
        900: "#1e3a5f",
      }
    },
    fontFamily: {
      sans: ["Inter", "system-ui", "sans-serif"],
    }
  }
}
```

Commit: `feat: design system with brand colors and typography`

---

### Task 8.2 — Public site UX components

**Files:**
- Create: `src/components/public/Breadcrumb.tsx`
- Create: `src/components/public/TableOfContents.tsx`
- Create: `src/components/public/RelatedArticles.tsx`
- Create: `src/components/public/RoleSelector.tsx`

**RoleSelector** — homepage "I am a..." card that filters categories relevant to the user type:
- IT Administrator → IT Setup & Onboarding, Data Sources
- Compliance Officer → Using the Platform, Security & Compliance
- Project Manager → Organisation & Roll-out, Getting Started
- End User → Using the Platform (end user section)

**TableOfContents** — auto-generated from H2/H3 headings in article, sticky on desktop, smooth scroll.

Commit: `feat: UX components (breadcrumb, TOC, related articles, role selector)`

---

### Task 8.3 — Mobile responsiveness

Test and fix all pages at 375px, 768px, 1280px breakpoints.

- Sidebar collapses to hamburger menu on mobile
- Category grid: 1 col mobile, 2 col tablet, 3 col desktop
- Article layout: TOC hidden on mobile (collapsible)
- Video player: full-width on mobile

Commit: `feat: mobile-responsive layout across all breakpoints`

---

## Phase 9: Deployment

### Task 9.1 — Nginx config & SSL

**Files:**
- Create: `nginx/super.support.conf`
- Create: `nginx/support.conf`

```nginx
server {
    listen 80;
    server_name super.support.dataandmore.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name super.support.dataandmore.com;

    ssl_certificate /etc/letsencrypt/live/super.support.dataandmore.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/super.support.dataandmore.com/privkey.pem;

    client_max_body_size 500M;  # for video uploads

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        alias /app/uploads/;
        add_header Cache-Control "public, max-age=31536000";
    }
}
```

Obtain cert: `certbot --nginx -d super.support.dataandmore.com`

Commit: `feat: Nginx config and SSL setup`

---

### Task 9.2 — Production Docker Compose

**Files:**
- Create: `docker-compose.prod.yml`
- Create: `deploy.sh`

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: support_portal
      POSTGRES_USER: support_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    image: support-portal:latest
    restart: always
    environment:
      DATABASE_URL: postgresql://support_user:${POSTGRES_PASSWORD}@db:5432/support_portal
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: https://super.support.dataandmore.com
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    volumes:
      - ./uploads:/app/uploads
    ports:
      - "3000:3000"
    depends_on:
      - db

volumes:
  postgres_data:
```

**deploy.sh:**
```bash
#!/bin/bash
set -e
docker build -t support-portal:latest .
docker compose -f docker-compose.prod.yml up -d --force-recreate app
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
echo "✅ Deploy complete"
```

Commit: `feat: production Docker Compose and deploy script`

---

### Task 9.3 — Hetzner server setup

Run on Hetzner VPS (CX21 or CX31 recommended — 4GB RAM minimum for FFmpeg):

```bash
# On Hetzner server
apt update && apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx ffmpeg
systemctl enable docker

# Clone repo and deploy
git clone <repo> /srv/support-portal
cd /srv/support-portal
cp .env.example .env  # fill in secrets
./deploy.sh
```

Commit: `docs: add Hetzner setup instructions to README`

---

## Phase 10: Testing & QA

### Task 10.1 — Core tests

**Files:**
- Create: `tests/auth.test.ts`
- Create: `tests/articles.test.ts`
- Create: `tests/translate.test.ts`

Key test cases:
- Unauthenticated user cannot access `/admin`
- Viewer role cannot create/edit articles
- Gated articles redirect unauthenticated users to login
- Article slug uniqueness enforced
- Translation returns valid Tiptap JSON
- Search returns ranked results

Run: `npm test`

Commit: `test: auth, article, and translation tests`

---

### Task 10.2 — Manual QA checklist

Before staging launch:
- [ ] All 7 categories display with correct translations in all 4 locales
- [ ] Language switcher persists locale and stays on same page
- [ ] Gated article blocks unauthenticated users
- [ ] Admin can create, edit, publish article
- [ ] Editor cannot access user management
- [ ] AI translation generates all 3 non-English drafts
- [ ] Video upload → processing → HLS playback works
- [ ] Search returns relevant results
- [ ] Mobile layout works at 375px
- [ ] `super.support.dataandmore.com` resolves with valid SSL

---

## Summary: What gets built

| Feature | Technology |
|---|---|
| Public multilingual site | Next.js App Router + PostgreSQL |
| 4 languages | `/[locale]/` routing + DB translations |
| Rich CMS editor | Tiptap |
| Auth + roles | NextAuth v5 + JWT |
| Gated content | Session check in server components |
| Self-hosted video | FFmpeg → HLS → HLS.js |
| AI translations | Claude API (claude-sonnet-4-6) |
| Full-text search | PostgreSQL `tsvector` |
| Media library | Sharp + local filesystem |
| Deployment | Docker + Nginx + Let's Encrypt |

**Estimated build phases:** 10 phases across ~40 tasks
**Target server:** Hetzner CX31 (4 vCPU, 8GB RAM, 160GB SSD)
