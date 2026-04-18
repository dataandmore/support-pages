# Data & More Support Portal

Self-hosted multilingual support portal — Next.js 16, PostgreSQL, FFmpeg, Tiptap, Claude AI.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL 16 + Prisma 7 |
| Auth | NextAuth v5 (credentials + JWT) |
| Editor | Tiptap (ProseMirror) |
| Video | FFmpeg → HLS (.m3u8 segments) |
| Images | Sharp (resize to max 2000px) |
| AI | Claude API (rewrite + translate) |
| Email | Postmark |
| Infra | Docker + Nginx + Hetzner |

---

## Local development

```bash
# 1. Clone and install
git clone <repo>
cd support-portal
npm install

# 2. Environment
cp .env.example .env.local
# Edit .env.local — at minimum set DATABASE_URL, NEXTAUTH_SECRET, ANTHROPIC_API_KEY

# 3. Start database
docker compose up -d db

# 4. Run migrations + seed
npx prisma migrate dev
npx prisma db seed

# 5. Start dev server
npm run dev
```

Open http://localhost:3000 — sign in with `dj@dataandmore.com` / `changeme123!`

---

## Content migration (one-time)

Run these scripts in order after the database is up:

```bash
# 1. Scrape all articles from HubSpot knowledge base
npm run migrate:scrape

# 2. Import scraped HTML into DB as DRAFT articles
npm run migrate:import

# 3. Claude rewrites all DRAFT articles (takes ~10–20 min for 97 articles)
npm run migrate:rewrite

# 4. Claude translates all articles to DA, SV, DE
npm run migrate:translate
```

---

## Hetzner server setup

### Prerequisites

Fresh **Ubuntu 22.04 LTS** server on Hetzner Cloud. Minimum: **CX21** (2 vCPU, 4 GB RAM).

### 1 — System packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx certbot python3-certbot-nginx ufw
```

### 2 — Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for the group to take effect
```

### 3 — Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # opens 80 + 443
sudo ufw enable
```

### 4 — Clone the repo

```bash
cd /opt
sudo git clone <repo-url> support-portal
sudo chown -R $USER:$USER support-portal
cd support-portal
```

### 5 — Environment file

```bash
cp .env.example .env.prod
nano .env.prod
```

Fill in all required variables:

```env
POSTGRES_PASSWORD=<strong-random-password>
NEXTAUTH_SECRET=<32-char-random-string>
NEXTAUTH_URL=https://super.support.dataandmore.com
ANTHROPIC_API_KEY=sk-ant-...
POSTMARK_API_KEY=...
POSTMARK_FROM_EMAIL=support@dataandmore.com
```

Generate secrets:
```bash
openssl rand -base64 32   # for NEXTAUTH_SECRET
openssl rand -hex 16      # for POSTGRES_PASSWORD
```

### 6 — Nginx configuration

```bash
# Staging
sudo cp nginx/super.support.conf /etc/nginx/sites-available/super.support.dataandmore.com
sudo ln -s /etc/nginx/sites-available/super.support.dataandmore.com \
           /etc/nginx/sites-enabled/

# Production (when ready)
sudo cp nginx/support.conf /etc/nginx/sites-available/support.dataandmore.com
sudo ln -s /etc/nginx/sites-available/support.dataandmore.com \
           /etc/nginx/sites-enabled/

sudo nginx -t && sudo systemctl reload nginx
```

### 7 — SSL certificates (Let's Encrypt)

```bash
# Point your DNS A records at this server IP first!

sudo certbot --nginx -d super.support.dataandmore.com \
  --non-interactive --agree-tos -m admin@dataandmore.com

# For production:
# sudo certbot --nginx -d support.dataandmore.com \
#   --non-interactive --agree-tos -m admin@dataandmore.com
```

Certbot auto-renews via a systemd timer — verify with:
```bash
sudo systemctl status certbot.timer
```

### 8 — First deploy

```bash
cd /opt/support-portal

# Build Docker image
docker build -t support-portal:latest .

# Start database
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d db

# Wait for DB to be healthy, then run migrations + seed
docker compose -f docker-compose.prod.yml --env-file .env.prod exec db \
  psql -U support_user -d support_portal -c "SELECT 1"

npx prisma migrate deploy
npx prisma db seed

# Start the app
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d app
```

### 9 — Verify

```bash
curl -s https://super.support.dataandmore.com | grep "Support"
docker compose -f docker-compose.prod.yml logs app --tail=20
```

---

## Ongoing deployments

```bash
cd /opt/support-portal
git pull
./deploy.sh
```

`deploy.sh` builds a new image, recreates the app container, waits for it to start, then runs `prisma migrate deploy`.

---

## Maintenance

```bash
# View app logs
docker compose -f docker-compose.prod.yml logs app -f

# Database shell
docker compose -f docker-compose.prod.yml exec db \
  psql -U support_user -d support_portal

# Backup database
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U support_user support_portal > backup-$(date +%Y%m%d).sql

# Restore database
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db \
  psql -U support_user support_portal

# Disk usage (uploads)
du -sh /opt/support-portal/uploads/
```

---

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Random 32-char string for JWT signing |
| `NEXTAUTH_URL` | ✅ | Full URL of the site (e.g. `https://support.dataandmore.com`) |
| `ANTHROPIC_API_KEY` | ✅ | Claude API key for AI rewrites + translations |
| `POSTMARK_API_KEY` | ✅ | Postmark API key for transactional email |
| `POSTMARK_FROM_EMAIL` | ✅ | From address (must be verified in Postmark) |
| `POSTGRES_PASSWORD` | prod | PostgreSQL password (Docker Compose only) |
