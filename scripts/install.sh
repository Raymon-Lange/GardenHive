#!/bin/bash
# install.sh — Pull all Docker images and verify setup
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "📦 GardenHive — Pulling images..."
echo ""
docker compose pull

echo ""
echo "  ✓ Images ready"
echo ""
echo "  Next steps:"
echo "    1. Add certs:   mkdir -p certs && cp /path/to/fullchain.crt certs/ && cp /path/to/privkey.key certs/"
echo "    2. Set env:     cp .env.example .env  (then edit JWT_SECRET and CORS_ORIGIN)"
echo "    3. Start:       ./scripts/start.sh"
