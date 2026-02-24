#!/bin/bash
# seed.sh — Trigger a database reseed via SEED_DATA env var
# WARNING: Wipes and re-seeds all data

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "🌱 GardenHive — Seeding database..."
echo ""

echo "  Restarting backend with SEED_DATA=true..."
SEED_DATA=true docker compose up -d --force-recreate backend

echo ""
echo "  Waiting for seed to complete..."
sleep 5
docker compose logs backend --tail=30

echo ""
echo "  Restoring normal startup..."
docker compose up -d --force-recreate backend

echo ""
echo "  ✓ Seeding complete"
