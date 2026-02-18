#!/bin/bash
# seed.sh — Run all seed scripts in order
# Usage:
#   ./scripts/seed.sh           — skip if data already exists
#   ./scripts/seed.sh --force   — wipe and re-seed everything

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FORCE=${1:-""}

echo "🌱 GardenHive — Seeding database..."

cd "$ROOT/backend"

echo ""
echo "  [1/4] Plant library..."
node src/seed/plants.js $FORCE

echo ""
echo "  [2/4] Default user..."
node src/seed/user.js $FORCE

echo ""
echo "  [3/4] Garden beds..."
node src/seed/beds.js $FORCE

echo ""
echo "  [4/4] Harvest data..."
node src/seed/harvests.js $FORCE

echo ""
echo "  ✓ Seeding complete"
