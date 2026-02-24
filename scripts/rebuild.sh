#!/bin/bash
# rebuild.sh — Pull latest images from GHCR and recreate all containers
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "🔨 GardenHive — Rebuilding..."
echo ""

echo "  Pulling latest images..."
docker compose pull

echo ""
echo "  Recreating containers..."
docker compose up -d --force-recreate

echo ""
"$ROOT/scripts/status.sh"
