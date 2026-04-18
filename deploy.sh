#!/bin/bash
set -e

echo "🚀 Deploying Data & More Support Portal..."

# Build the Docker image
docker build -t support-portal:latest .

# Restart the app container with the new image
docker compose -f docker-compose.prod.yml up -d --force-recreate app

# Run database migrations
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

echo "✅ Deploy complete"
