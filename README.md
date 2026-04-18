# Data & More Support Portal

Self-hosted multilingual support portal built with Next.js 15, PostgreSQL, and Tiptap.

## Stack
- Next.js 15 (App Router)
- PostgreSQL + Prisma
- NextAuth v5
- Tiptap rich editor
- FFmpeg video transcoding
- Claude AI translations
- Postmark email
- Docker + Nginx

## Getting started
cp .env.example .env.local
# Fill in your environment variables
docker compose up -d
npx prisma migrate dev
npm run dev
