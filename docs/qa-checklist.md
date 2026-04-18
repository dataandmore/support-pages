# Manual QA Checklist

Run through this before each production deploy. Check each item against the staging site (super.support.dataandmore.com) first, then production.

---

## 1 — Public site (unauthenticated)

### Homepage
- [ ] Homepage loads at `/en`
- [ ] Root `/` redirects to `/en`
- [ ] Hero search bar submits and navigates to `/en/search?q=...`
- [ ] Category grid shows all categories with icons
- [ ] Category card article count matches DB
- [ ] Language switcher in header changes locale (EN → DA → SV → DE)
- [ ] Footer shows correct copyright year and links work

### Locale routing
- [ ] `/da` shows Danish homepage hero text
- [ ] `/sv` shows Swedish homepage hero text
- [ ] `/de` shows German homepage hero text
- [ ] Language switcher cookie persists locale across page reloads
- [ ] `/en/knowledge/...` shows English article
- [ ] `/da/knowledge/...` shows Danish translation (or falls back gracefully)

### Category page
- [ ] `/en/knowledge/{slug}` lists articles in that category
- [ ] Only PUBLISHED articles appear in the list
- [ ] Breadcrumb links navigate correctly
- [ ] Gated category shows login badge

### Article page
- [ ] Article title, excerpt, and reading time display
- [ ] Published date shows for published articles
- [ ] Article content renders (headings, links, code blocks, images)
- [ ] Table of contents appears at xl+ width
- [ ] TOC highlights active heading on scroll
- [ ] Related articles section shows linked articles
- [ ] Gated article redirects to `/en/login?callbackUrl=...` when unauthenticated

### Search
- [ ] Search results page shows results for a known article keyword
- [ ] Empty search shows "no results" message
- [ ] Search works in all 4 locales

### Login
- [ ] `/en/login` renders login form
- [ ] Invalid credentials shows error message
- [ ] Valid credentials redirects to `/admin`
- [ ] callbackUrl param redirects to correct page after login

---

## 2 — Admin (authenticated)

### Access control
- [ ] `/admin` without session redirects to `/en/login`
- [ ] VIEWER cannot see Users or Settings menu items
- [ ] EDITOR can see articles, categories, videos, media
- [ ] ADMIN can see all menu items including Users and Settings

### Articles
- [ ] Article list shows all articles with status badges per locale
- [ ] Create new article: enter title, write content, save → appears in list
- [ ] Locale tabs (EN/DA/SV/DE) switch translation panes correctly
- [ ] AI translate button populates non-EN tab with AI_DRAFT status
- [ ] Status selector changes between DRAFT / AI_DRAFT / IN_REVIEW / PUBLISHED
- [ ] Published article appears on public site immediately
- [ ] isGated toggle works — gated article redirects unauthenticated users

### Rich editor
- [ ] Bold, italic, underline, strikethrough work
- [ ] H1, H2, H3 headings work
- [ ] Bullet list and numbered list work
- [ ] Code block renders with dark background
- [ ] Link insertion dialog works
- [ ] Image button opens MediaPicker modal
- [ ] MediaPicker shows existing images from media library
- [ ] Uploading new image in MediaPicker adds it to the grid and inserts it
- [ ] YouTube embed: paste URL → video thumbnail appears in editor
- [ ] Table insertion works

### Categories
- [ ] Category list shows all categories with drag-to-reorder handles
- [ ] Saving name/description/icon updates on public homepage
- [ ] Category translations work (EN, DA, SV, DE tabs)

### Videos
- [ ] Upload zone accepts drag-drop and click-to-browse
- [ ] Progress bar fills during upload
- [ ] After upload: status shows UPLOADING → PROCESSING → READY (poll 3s)
- [ ] Thumbnail appears once transcoding is complete
- [ ] Duration column shows correct M:SS
- [ ] Edit modal saves title/description per locale
- [ ] isGated toggle locks video behind auth in stream route
- [ ] Delete removes row from list and files from disk
- [ ] Gated HLS playlist returns 401 when unauthenticated

### Media library
- [ ] Image upload (JPEG, PNG, WebP) works
- [ ] Uploaded image appears in grid
- [ ] Hover shows copy URL and delete buttons
- [ ] Copy URL copies the correct stream URL to clipboard
- [ ] Click opens lightbox with full-size preview
- [ ] Delete removes image from grid and from disk
- [ ] SVG and GIF upload (no resize)

### Users (ADMIN only)
- [ ] User list shows all users with role badges
- [ ] Invite user form: enter email → receive invite email → account created
- [ ] Role dropdown changes user role immediately
- [ ] Cannot demote self from ADMIN

---

## 3 — Video player (public)

- [ ] HLS video plays on Chrome/Firefox (HLS.js)
- [ ] HLS video plays on Safari (native HLS)
- [ ] Video poster (thumbnail) shows before play
- [ ] Gated video: unauthenticated user gets 401 from `/api/stream/...`

---

## 4 — Mobile (375px viewport)

- [ ] Homepage hero text and search bar are readable
- [ ] Category grid stacks to single column
- [ ] Header hamburger menu opens mobile nav
- [ ] Language switcher accessible in mobile menu
- [ ] Article page readable without horizontal scroll
- [ ] Article TOC sidebar hidden on mobile (appears at xl+)
- [ ] Admin videos upload zone works on mobile (file picker opens)

---

## 5 — Performance

- [ ] Lighthouse score ≥ 90 performance on homepage (run in incognito)
- [ ] `/_next/static/` assets have `Cache-Control: immutable` headers
- [ ] HLS segments have `Cache-Control: max-age=31536000` headers
- [ ] Gzip is applied to JSON API responses (check `Content-Encoding: gzip`)

---

## 6 — Security

- [ ] HTTPS enforced — HTTP redirects to HTTPS
- [ ] `X-Frame-Options: SAMEORIGIN` in response headers
- [ ] `X-Content-Type-Options: nosniff` in response headers
- [ ] Path traversal blocked: `GET /api/stream/../../../etc/passwd` → 403
- [ ] Admin routes inaccessible without session (test with curl without cookies)
- [ ] Video upload restricted to ADMIN/EDITOR (test with VIEWER session)

---

## 7 — Content migration (one-time)

- [ ] `npm run migrate:scrape` completes without errors (97 articles)
- [ ] `npm run migrate:import` creates articles in DB (check admin articles list)
- [ ] `npm run migrate:rewrite` updates articles to AI_DRAFT
- [ ] `npm run migrate:translate` creates DA/SV/DE translations

---

## Sign-off

| Tester | Date | Env | Notes |
|--------|------|-----|-------|
|        |      | staging | |
|        |      | production | |
