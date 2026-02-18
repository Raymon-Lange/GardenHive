#!/bin/bash
# reset.sh — Full database wipe and re-seed from scratch
# WARNING: Destroys all data

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "⚠️  GardenHive — Full database reset"
echo ""
read -p "  This will DELETE all data and re-seed. Continue? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "  Aborted."
  exit 0
fi

echo ""
echo "  Wiping and re-seeding..."
"$ROOT/scripts/seed.sh" --force

echo ""
echo "  ✓ Database reset complete"
