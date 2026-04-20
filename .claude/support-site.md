# Data & More Support Portal — Full Technical Handoff

> **Purpose of this document:** Complete project context for the next AI session. Written April 2026. Covers architecture, data model, all routes/components, recent bug fixes, migration scripts, deployment, and known issues.

---

## Project Overview

The **Data & More Support Portal** is a self-hosted, multilingual knowledge base built to replace HubSpot's support portal. It serves product documentation, how-to guides, and onboarding articles for Data & More customers in four languages: English, Danish, Swedish, and German.

**Key URLs:**
- Dev server: `http://localhost:3040` (port 3040 to avoid conflicts)
- Staging: `https://super.support.dataandmore.com`
- Production: `https://support.dataandmore.com`
- Original HubSpot source: `https://support.dataandmore.com/en/knowledge/`

**Tech stack:** Next.js 16 (App Router) · PostgreSQL 16 · Prisma 7 · Tiptap 3 (rich text) · NextAuth v5 · Tailwind CSS v4 · Claude AI (claude-sonnet-4-6) · hls.js · FFmpeg · Sharp · Postmark

**Design rules (strictly enforced):**
- Primary colour: `#EC6E1E` (orange)
- NO blue, NO generic icons — use emoji or text
- B2B tone — formal language in all locales

---

## Repository

```
/Users/davidjunge/Documents/claude-projects/support pages/
GitHub: https://github.com/djunge/dam-support-portal (private)
Branch: main
Worktree (feature): .worktrees/feature/support-portal/
```

The active development happens in the **worktree** at `.worktrees/feature/support-portal/`. When running scripts or the dev server, `cd` into that directory.

---

## Quick Start

```bash
cd "/Users/davidjunge/Documents/claude-projects/support pages/.worktrees/feature/support-portal"
npm install
cp .env.example .env.local  # fill in DATABASE_URL, NEXTAUTH_SECRET, ANTHROPIC_API_KEY
docker compose up -d db     # start PostgreSQL
npx prisma migrate dev
npm run dev                 # starts on port 3040

# Default admin login: dj@dataandmore.com / changeme123!
```

---

## Environment Variables

File: `.env.local` (never committed — gitignored)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://support_user:pass@localhost:5432/support_portal` |
| `NEXTAUTH_SECRET` | 32-char random string for JWT signing (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Full URL of the portal, e.g. `http://localhost:3040` |
| `ANTHROPIC_API_KEY` | Claude API key (`sk-ant-...`) — used for translation and rewriting |
| `POSTMARK_API_KEY` | Postmark server API key for transactional email |
| `POSTMARK_FROM_EMAIL` | Verified sender, e.g. `support@dataandmore.com` |
| `POSTGRES_PASSWORD` | Production only (Docker Compose) |

**Important gotcha:** The Claude Code harness pre-injects `ANTHROPIC_API_KEY=""` (empty string) into the shell environment. This means `process.env.ANTHROPIC_API_KEY` will be empty even if `.env.local` has the correct value. The translate scripts use `readEnvFile()` to read `.env.local` directly with `fs.readFileSync` to bypass this. Do not use `process.loadEnvFile()` or `dotenv.config()` — they refuse to overwrite already-set env vars.

---

## Data Model

Schema: `prisma/schema.prisma`

### Enums
- `Role`: `ADMIN | EDITOR | VIEWER`
- `ArticleStatus`: `DRAFT | AI_DRAFT | IN_REVIEW | PUBLISHED`
- `VideoStatus`: `UPLOADING | PROCESSING | READY | ERROR`

### Key Tables

**Article** — core article record
- `slug` (unique URL slug)
- `categoryId` (nullable FK → Category)
- `isGated` (bool — requires login)
- `pinned` (bool — featured on category page)
- `position` (int — sort order)

**ArticleTranslation** — one per locale per article
- `articleId + locale` (composite unique)
- `title`, `content` (Tiptap JSON, stored as `Json`), `excerpt`
- `status` (DRAFT → AI_DRAFT → IN_REVIEW → PUBLISHED)
- `translatedBy`, `reviewedBy` (User FKs, nullable)

**Category** — hierarchical
- `slug`, `icon` (emoji), `position`, `isGated`
- `parentId` (self-referential, nullable — for sub-categories)

**CategoryTranslation** — one per locale per category
- `locale`, `name`, `description`

**Video** — uploaded/transcoded videos
- `slug`, `filename`, `status`, `hlsPath` (m3u8), `thumbnailPath`, `duration`
- `isGated`

**VideoTranslation** — locale metadata for videos
- `locale`, `title`, `description`

**Media** — uploaded images
- `filename` (unique on disk), `url`, `mimetype`, `size` (BigInt)

**User** — admin/editor accounts
- `email` (unique), `passwordHash`, `role`, `name`

**Tag / ArticleTag** — many-to-many article tags

**RelatedArticle** — self-referential many-to-many between articles

---

## Route Structure

### Public routes (locale-prefixed)

```
/[locale]/                                  → Homepage (hero, category grid, featured articles)
/[locale]/knowledge/[categorySlug]/         → Category listing
/[locale]/knowledge/[categorySlug]/[articleSlug]/  → Article detail
/[locale]/search/                           → Search results
/[locale]/videos/                           → Video gallery
/[locale]/login/                            → Login page
```

All public routes accept `en | da | sv | de` as locale. Invalid locale falls back to `en`.

### Admin routes (auth-protected)

```
/admin/                        → Dashboard
/admin/articles/               → Article list (with status dots per locale)
/admin/articles/new            → Create article
/admin/articles/[id]/          → Edit article (Tiptap + locale tabs + preview)
/admin/categories/             → Category management (create, reorder, hierarchy)
/admin/media/                  → Image library
/admin/videos/                 → Video list + upload
/admin/users/                  → User management
/admin/settings/               → API keys (Anthropic, HubSpot, Synthesia)
```

Admin requires authentication. Unauthenticated requests redirect to `/en/login`.

### API routes

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/articles` | List / create articles |
| GET/PATCH/DELETE | `/api/articles/[id]` | Single article CRUD |
| GET/POST | `/api/categories` | List / create categories |
| PATCH | `/api/categories` | Reorder categories |
| GET/PATCH/DELETE | `/api/categories/[id]` | Single category CRUD |
| GET/POST | `/api/media` | List / upload images |
| GET/POST | `/api/videos` | List / upload videos |
| GET | `/api/videos/[id]/status` | Poll transcoding progress |
| GET | `/api/videos/[id]/stream` | Serve HLS playlist |
| POST | `/api/translate` | Trigger AI translation for one article+locale |
| GET | `/api/search?q=&locale=` | Full-text PostgreSQL search (PUBLISHED only) |
| GET/POST | `/api/auth/[...nextauth]` | NextAuth credentials handler |
| GET/POST | `/api/users` | List / create users |
| GET | `/api/settings` | Portal settings |
| GET | `/api/hubspot-archive/[slug]` | Serve archived HubSpot HTML with Bootstrap CSS injected |
| GET | `/api/stream/[...path]` | Serve uploaded files (images, HLS segments) |

---

## Component Architecture

### Public (`src/components/public/`)

| Component | Purpose |
|---|---|
| `Header.tsx` | Top nav: logo, search, language switcher, admin link |
| `PublicShell.tsx` | Layout wrapper (Header + Footer) |
| `PublicSidebar.tsx` | Collapsible sidebar with category tree |
| `HeroSearch.tsx` | Large search on homepage |
| `HeroVideo.tsx` | Background video carousel (HLS) |
| `LanguageSwitcher.tsx` | Locale dropdown (en/da/sv/de) |
| `ArticleContent.tsx` | Renders Tiptap JSON → HTML (uses `tiptapToHTML()`) |
| `ArticleAdminBar.tsx` | Edit/preview/original buttons for admins on article pages |
| `HubspotPreviewModal.tsx` | Modal preview of archived HubSpot HTML |
| `VideoPlayer.tsx` | hls.js player |
| `TableOfContents.tsx` | Auto-generated from article headings |
| `RelatedArticles.tsx` | Sidebar of related articles |
| `TranslationNotice.tsx` | Banner when viewing AI-translated content |

### Admin (`src/components/admin/`)

| Component | Purpose |
|---|---|
| `RichEditor.tsx` | Tiptap WYSIWYG editor — uses `article-content` CSS class for true WYSIWYG |
| `EditorToolbar.tsx` | Formatting buttons (bold/italic/table/image/links/alignment) |
| `MediaPicker.tsx` | Image selector/uploader modal (used inside editor) |
| `TranslationPanel.tsx` | Per-locale AI translation trigger UI |
| `VideoUploader.tsx` | Drag-drop video upload with progress |
| `SynthesiaImportPanel.tsx` | Bulk Synthesia video import |
| `Sidebar.tsx` | Admin navigation |

### Libraries (`src/lib/`)

| File | Purpose |
|---|---|
| `tiptap-to-html.ts` | **Zero-dependency Tiptap JSON → HTML serialiser** (see note below) |
| `auth.ts` | NextAuth v5 config (JWT, Credentials provider) |
| `i18n.ts` | Locale constants, `isValidLocale()`, `getLocaleFromCookie()` |
| `prisma.ts` | Prisma singleton |
| `translate.ts` | Single-article Claude translation helper |
| `ffmpeg.ts` | HLS transcoding + thumbnail generation |
| `search.ts` | PostgreSQL full-text search query |
| `email.ts` | Postmark email templates (invite, reset, welcome) |

---

## `tiptap-to-html.ts` — Critical SSR-Safe Serialiser

**Why it exists:** Tiptap v3's `@tiptap/html` package has two exports:
- Default (`@tiptap/html`) — browser build, requires DOM, works client-side only
- `/server` sub-path — uses `happy-dom`, which requires Node.js `child_process` — breaks when imported transitively from a `"use client"` component

For table articles, `@tiptap/html` fails in SSR because `@tiptap/extension-table` touches DOM APIs. Rather than fighting the bundler, we wrote a **pure function serialiser** with zero dependencies.

**Location:** `src/lib/tiptap-to-html.ts`

**Supports:** `paragraph`, `heading` (with textAlign), `bulletList`, `orderedList`, `listItem`, `blockquote`, `codeBlock`, `image`, `horizontalRule`, `table` (with colspan/rowspan), `videoEmbed`. Inline marks: bold, italic, underline, code, highlight, strike, link.

**Usage:**
```ts
import { tiptapToHTML } from "@/lib/tiptap-to-html"
const html = tiptapToHTML(article.content)  // returns HTML string
```

**`ArticleContent.tsx`** strips a leading `<h1>` from the generated HTML because the article page already renders the title in a `<header>` above the content block.

---

## Styling Conventions

**File:** `src/app/globals.css`

`.article-content` — the master class for article body rendering. Applied to:
1. Public article pages (via `ArticleContent.tsx` → `dangerouslySetInnerHTML`)
2. Admin Tiptap editor (via `editorProps.attributes.class`) — this gives true WYSIWYG

Key rules:
- Tables: full cell borders (`border: 1px solid #e5e7eb`), first-row styled as header (grey bg, bold, 2px bottom border) — HubSpot articles use `<td>` everywhere with no `<th>` elements
- Code blocks: dark slate background (`#1e293b`), light text
- Blockquotes: orange left-border with light orange background
- Video embeds: 16:9 responsive wrapper (padding-bottom: 56.25%)
- ProseMirror placeholder and cursor rules live here too

**Admin RichEditor** sets `editorProps.attributes.class` to `article-content` so the editor matches the public page visually exactly.

---

## Translation System

### Database state (April 2026)
- 109 EN articles in DB (109 Article + ArticleTranslation for `en`)
- DA, SV, DE translations: all completed — status `AI_DRAFT`, awaiting human review

### How translation works

Articles are translated **text-node by text-node**, not by regenerating the full Tiptap JSON. This approach is critical:

1. `collectTexts(tiptapDoc)` → walks the Tiptap JSON tree, collects all leaf `text` nodes into an ordered array
2. The array + title + excerpt are sent to Claude in a **delimiter-based format** (not JSON)
3. Claude returns the same delimiter format with translated text
4. `applyTexts(tiptapDoc, translatedTexts)` → walks the same tree and substitutes each text node in order

**Why not JSON?** Claude reliably produces invalid JSON for text content — unescaped literal newlines inside string values, especially for long articles. The delimiter format (`===TITLE===\n...===1===\n...===2===\n...`) is immune to this because newlines inside a section are just part of the value.

**Why not full-doc translation?** Large articles (e.g. 43-row privacy classification table = ~11K output tokens) exceed Claude's 8192 output token limit when the full Tiptap JSON must be reproduced. Text extraction reduces the payload to just the translatable strings (~20-30% of the doc size).

### Scripts

```bash
# Full first-time translation (all locales from scratch)
npm run migrate:translate -- --force

# Retry only articles where locale title still matches EN (i.e. failed last time)
npm run migrate:translate:retry

# Translate specific locales only
npm run migrate:translate -- --locale=da,sv
```

**`scripts/translate-all.ts`** — the main translation script:
- `--force`: re-translate even PUBLISHED records
- `--retry-failed`: only process articles where the locale title === EN title (failed translations are detectable this way)
- `--locale=da,sv,de`: filter which locales to process
- Retry logic: 3 attempts with 15s/30s backoff on 529 (overloaded) errors
- Rate limiting: 1s sleep between API calls

---

## Content Import Pipeline

HubSpot articles were imported in a multi-step pipeline:

```
HubSpot live site
  ↓ scripts/scrape-hubspot.ts
public/hubspot-archive/*.html          (archived raw HTML — not committed, ~50MB)
  ↓ scripts/import-content.ts
PostgreSQL (ArticleTranslation en:DRAFT)
  ↓ scripts/translate-all.ts
PostgreSQL (ArticleTranslation da/sv/de:AI_DRAFT)
```

**`scripts/import-content.ts`** — HTML → Tiptap JSON:
- Parses with Cheerio
- Converts `<h1>`–`<h6>`, `<p>`, `<ul>`, `<ol>`, `<table>`, `<blockquote>`, `<pre>`, `<img>`, `<iframe>` (video embeds)
- Table handling: maps `<th>` → `tableHeader`, `<td>` → `tableCell`, handles `colspan`/`rowspan`, treats `<thead>`/`<tbody>`/`<tfoot>` transparently
- Run with `--update` flag to re-import and update existing articles: `npm run migrate:import -- --update`

**`public/hubspot-archive/`** — static HTML files from the original HubSpot scrape. Served via `/api/hubspot-archive/[slug]` which injects Bootstrap 2 grid CSS before returning the HTML (HubSpot templates use `.row-fluid`, `.span12`, `.dnd-*` classes that need Bootstrap to render correctly).

---

## Video System

Videos are uploaded via admin, transcoded to HLS with FFmpeg, and served to clients via hls.js.

**Upload flow:**
1. POST `/api/videos` — saves original to `uploads/videos/originals/`, creates DB record (`UPLOADING`)
2. Background Promise chain: FFmpeg → HLS segments in `uploads/videos/hls/{id}/`, thumbnail at `uploads/videos/thumbnails/{id}.jpg`
3. DB status: `UPLOADING` → `PROCESSING` → `READY` (or `ERROR`)
4. Client polls `/api/videos/[id]/status` every 2s until `READY`

**FFmpeg output:** HLS playlist (`playlist.m3u8`) + `.ts` segments (6-second chunks) + JPEG thumbnail (640px wide, captured at 2-second mark)

**Synthesia integration:** Videos are also imported from Synthesia (AI video platform). Admin can bulk-import from `/admin/videos` using stored Synthesia API key.

---

## HubSpot Archive Preview

Admin users viewing an article can click "Preview HubSpot" to see the original scraped article.

**`src/app/api/hubspot-archive/[slug]/route.ts`:**
- Reads `public/hubspot-archive/{slug}.html`
- Validates slug format (`[a-z0-9-]+`) to prevent path traversal
- Injects Bootstrap 2 grid CSS + HubSpot-specific display overrides before the `</head>` tag
- Returns raw HTML with `Content-Type: text/html`

**`HubspotPreviewModal.tsx`:** Loads archive via `/api/hubspot-archive/{slug}` in an iframe.

---

## Authentication

- **Provider:** NextAuth v5 Credentials (email + bcrypt password)
- **Session:** JWT tokens
- **Roles:** `ADMIN > EDITOR > VIEWER`
- **Admin access:** Checked in `src/app/admin/layout.tsx` — redirects to `/en/login` if not authenticated
- **API protection:** Each API route calls `auth()` from `src/lib/auth.ts` and checks role

Default seed user: `dj@dataandmore.com` (ADMIN role) — password set in `prisma/seed.ts`.

---

## Article Admin Page (`/admin/articles/[id]`)

Key behaviours:
- **Tiptap uncontrolled:** The editor reads `content` only once at mount. `key={activeLocale}` forces a full remount when switching locale tabs — this is intentional and correct.
- **`contentLoaded` guard:** Set to `false` initially (for existing articles), `true` after API fetch completes. The editor is not rendered until `contentLoaded = true` — prevents Tiptap mounting with empty content and ignoring the real data.
- **Preview overlay:** Uses `<RichEditor readOnly>` in a full-screen overlay. Both editor and preview use the same `article-content` CSS class, so preview = exactly what the public page looks like.
- **"View on site" link:** Only appears after save (needs `categorySlug` + `articleSlug` which are set on save).
- **"Original" button:** Links to `https://support.dataandmore.com/en/knowledge/{slug}` — opens the live HubSpot article for comparison.
- **Locale tabs:** DA/SV/DE show a coloured dot: green = PUBLISHED, purple = AI_DRAFT, grey = DRAFT/empty.

---

## ArticleAdminBar

Shows a floating bar at the top of article pages for authenticated admins/editors. Contains:
- **Edit** → `/admin/articles/{id}`
- **Preview** → inline preview toggle
- **Original** → opens `https://support.dataandmore.com/en/knowledge/{slug}` in new tab

Located: `src/components/public/ArticleAdminBar.tsx`

---

## Deployment

### Docker (production)

```bash
# On Hetzner server
git pull
docker build -t support-portal:latest .
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d app
npx prisma migrate deploy
```

The `Dockerfile` is multi-stage (deps → builder → runner). Uses `node:20-alpine` with FFmpeg installed via `apk`. Output mode is `standalone` (set in `next.config.ts`). App runs as non-root user `nextjs:nodejs`.

### Nginx

Two configs in `nginx/`:
- `super.support.conf` → staging (`super.support.dataandmore.com`)
- `support.conf` → production (`support.dataandmore.com`)

Both proxy to `localhost:3000` and handle SSL termination via Let's Encrypt.

---

## Known Issues & Gotchas

### 1. Video transcoding not queued
FFmpeg runs as a fire-and-forget Promise. If multiple videos are uploaded simultaneously, the server may be overloaded. A job queue (Bull/BullMQ) would fix this.

### 2. BigInt serialization
`Media.size` and `Video.size` are `BigInt` in Prisma. They cannot be serialized to JSON with `JSON.stringify`. API routes must convert to `string` or `number` before returning: `size: Number(video.size)`.

### 3. Prisma 7 "config-first"
Database URL is in `prisma.config.ts`, not `schema.prisma` datasource block. When running Prisma commands, ensure `DATABASE_URL` is set in the environment.

### 4. ANTHROPIC_API_KEY harness injection
See env vars section above. Always use `readEnvFile('.env.local')` in scripts rather than `process.env.ANTHROPIC_API_KEY`.

### 5. Tiptap + SSR
Never import `@tiptap/html` (default export) in server components. Use `src/lib/tiptap-to-html.ts` instead. The `@tiptap/html/server` path uses `happy-dom` which imports `child_process` — breaks client bundles via transitive imports.

### 6. `next.config.ts` external packages
`serverExternalPackages: ["pg", "pg-native", "@prisma/client", "prisma"]` must remain — removes these from the Next.js/Turbopack bundle to prevent native module errors.

### 7. 6 duplicate DRAFT articles
There are ~6 articles with `-2` suffix slugs (e.g. `article-slug-2`) — orphaned DRAFT records from a re-import. They have only `en:DRAFT` translations and no published content. Safe to delete from `/admin/articles`.

---

## File Structure Reference

```
.
├── prisma/
│   ├── schema.prisma           ← Full data model
│   ├── seed.ts                 ← Default admin user + demo categories
│   └── migrations/             ← SQL migration history
├── scripts/
│   ├── scrape-hubspot.ts       ← Scrape live HubSpot site
│   ├── import-content.ts       ← HTML → Tiptap JSON → DB
│   ├── translate-all.ts        ← Batch AI translation (DA/SV/DE)
│   ├── rewrite-articles.ts     ← AI content improvement pass
│   └── import-synthesia.ts     ← Import Synthesia videos
├── src/
│   ├── app/
│   │   ├── [locale]/           ← Public pages
│   │   ├── admin/              ← Admin pages (auth-protected)
│   │   ├── api/                ← All API routes
│   │   ├── globals.css         ← Global styles + .article-content
│   │   └── layout.tsx          ← App root (Providers)
│   ├── components/
│   │   ├── public/             ← Public-facing components
│   │   ├── admin/              ← Admin-only components
│   │   └── Providers.tsx       ← NextAuth session provider
│   └── lib/
│       ├── tiptap-to-html.ts   ← Zero-dep Tiptap serialiser (SSR safe)
│       ├── auth.ts             ← NextAuth config
│       ├── prisma.ts           ← DB client singleton
│       ├── translate.ts        ← Single-article translation
│       ├── ffmpeg.ts           ← HLS transcoding
│       ├── search.ts           ← Full-text search
│       ├── i18n.ts             ← Locale helpers
│       └── email.ts            ← Postmark email templates
├── public/
│   ├── hubspot-archive/        ← Scraped HubSpot HTML (gitignored, ~50MB)
│   └── article-images/         ← Scraped images (gitignored)
├── .env.example                ← Template for .env.local
├── Dockerfile                  ← Multi-stage production build
├── docker-compose.yml          ← Dev (app + postgres)
├── docker-compose.prod.yml     ← Production
├── deploy.sh                   ← One-command deploy script
└── nginx/
    ├── support.conf            ← Production nginx config
    └── super.support.conf      ← Staging nginx config
```

---

## Suggested Next Steps

1. **Human review of AI translations** — All DA/SV/DE articles are `AI_DRAFT`. An editor should review and set to `PUBLISHED`. Use `/admin/articles` to filter by locale and status.

2. **Delete duplicate draft articles** — ~6 articles with `-2` slug suffix. Find in `/admin/articles`, filter by DRAFT status.

3. **Video status check** — Some Synthesia videos may still be in `PROCESSING` state. Check `/admin/videos` and re-trigger transcoding if stuck.

4. **Set `PUBLISHED` status for EN articles** — Most EN articles are still `DRAFT`. Review and publish via admin or via a bulk SQL update: `UPDATE "ArticleTranslation" SET status='PUBLISHED' WHERE locale='en' AND status='DRAFT'`.

5. **Implement video job queue** — Current fire-and-forget transcoding will fail under concurrent uploads. Use BullMQ with a Redis adapter.

6. **Add article versioning** — `ArticleTranslation.content` is overwritten on every save. Consider a `ArticleRevision` table for audit history.

7. **Analytics** — No view counting yet. Add a `ArticleView` table with `articleId`, `locale`, `timestamp`, `sessionId` for lightweight analytics.
