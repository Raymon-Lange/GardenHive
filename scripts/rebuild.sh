#!/bin/bash
# rebuild.sh — Kill servers, rebuild frontend, restart everything

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔨 GardenHive — Rebuilding..."

# Stop running servers
"$ROOT/scripts/stop.sh"

# Build frontend
echo ""
echo "  Building frontend..."
cd "$ROOT/frontend"
npm run build

echo "  ✓ Build complete"

# Restart
echo ""
"$ROOT/scripts/start.sh"
