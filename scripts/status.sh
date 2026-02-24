#!/bin/bash
# status.sh — Show status of all GardenHive services

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "📊 GardenHive — Service status"
echo ""
docker compose ps
echo ""
