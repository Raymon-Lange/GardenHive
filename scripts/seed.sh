#!/bin/bash
# seed.sh — Run all seed scripts in order (user → plants → beds → harvests)
# Usage:
#   ./scripts/seed.sh           — skip if data already exists
#   ./scripts/seed.sh --force   — wipe and re-seed everything

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FORCE=${1:-""}

echo "🌱 GardenHive — Seeding database..."
echo ""

cd "$ROOT/backend"
node src/seed/index.js $FORCE

echo ""
echo "  ✓ Seeding complete"
