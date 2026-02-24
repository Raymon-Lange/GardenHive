#!/bin/bash
# stop.sh — Stop all GardenHive services

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "🛑 GardenHive — Stopping all services..."
echo ""
docker compose down

echo "  ✓ All services stopped"
