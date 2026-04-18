#!/bin/bash
# deploy.sh — Build and deploy the Data & More Support Portal
# Usage: ./deploy.sh [--env-file FILE]
# Default env file: .env.prod
set -euo pipefail

ENV_FILE=".env.prod"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: ./deploy.sh [--env-file FILE]"
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Env file '$ENV_FILE' not found. Copy .env.example and fill in values."
  exit 1
fi

echo "🚀 Deploying Data & More Support Portal (env: $ENV_FILE)..."

# ── Build ──────────────────────────────────────────────────────────────────
echo "🔨 Building Docker image..."
docker build -t support-portal:latest .

# ── Recreate app container ─────────────────────────────────────────────────
echo "🔄 Restarting app container..."
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" \
  up -d --force-recreate app

# ── Wait for container to be healthy ──────────────────────────────────────
echo "⏳ Waiting for app to start..."
for i in $(seq 1 30); do
  STATUS=$(docker compose -f docker-compose.prod.yml ps app --format json 2>/dev/null \
    | grep -c '"State":"running"' || true)
  if [ "$STATUS" -gt "0" ]; then
    echo "   ✓ App is running (attempt $i)"
    break
  fi
  if [ "$i" -eq "30" ]; then
    echo "❌ App did not start after 60s"
    docker compose -f docker-compose.prod.yml logs app --tail=30
    exit 1
  fi
  echo "   attempt $i/30..."
  sleep 2
done

# ── Database migrations ────────────────────────────────────────────────────
echo "🗄️  Running database migrations..."
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" \
  exec app npx prisma migrate deploy

echo ""
echo "✅ Deploy complete!"
echo "   Site: $(grep NEXTAUTH_URL "$ENV_FILE" | cut -d= -f2)"
