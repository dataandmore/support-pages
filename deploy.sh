#!/bin/bash
set -e

echo "🚀 Deploying Data & More Support Portal..."

# Build the Docker image
docker build -t support-portal:latest .

# Restart the app container with the new image
docker compose -f docker-compose.prod.yml up -d --force-recreate app

# Wait for app container to be running
echo "Waiting for app container..."
for i in $(seq 1 30); do
  STATUS=$(docker compose -f docker-compose.prod.yml ps app --format json 2>/dev/null | grep -c '"State":"running"' || true)
  if [ "$STATUS" -gt "0" ]; then break; fi
  echo "  attempt $i/30..."
  sleep 2
done

# Run database migrations
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

echo "✅ Deploy complete"
