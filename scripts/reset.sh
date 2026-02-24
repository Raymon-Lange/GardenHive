#!/bin/bash
# reset.sh — Wipe all volumes and re-seed from scratch
# WARNING: Destroys all data

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "⚠️  GardenHive — Full database reset"
echo ""
read -p "  This will DELETE all data and re-seed. Continue? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "  Aborted."
  exit 0
fi

echo ""
echo "  Stopping services and wiping volumes..."
docker compose down -v

echo ""
echo "  Starting fresh with seed..."
SEED_DATA=true docker compose up -d

echo ""
echo "  Waiting for seed to complete..."
sleep 5
docker compose logs backend --tail=30

echo ""
echo "  Restoring normal startup..."
docker compose up -d --force-recreate backend

echo ""
echo "  ✓ Reset complete"
