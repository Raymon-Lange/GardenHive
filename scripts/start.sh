#!/bin/bash
# start.sh — Start all GardenHive services via Docker Compose
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "🌿 GardenHive — Starting all services (dev)..."
echo ""
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

echo ""
echo "  ✓ Frontend: http://localhost:5173"
echo "  ✓ Backend:  http://localhost:5000 (internal)"
echo ""
echo "  Logs:    ./scripts/logs.sh"
echo "  Stop:    ./scripts/stop.sh"
echo "  Status:  ./scripts/status.sh"
