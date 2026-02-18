#!/bin/bash
# install.sh — Fresh install: install all dependencies for backend and frontend

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "📦 GardenHive — Installing dependencies..."

echo ""
echo "  [1/2] Backend..."
cd "$ROOT/backend" && npm install

echo ""
echo "  [2/2] Frontend..."
cd "$ROOT/frontend" && npm install

echo ""
echo "  ✓ All dependencies installed"
echo ""
echo "  Next steps:"
echo "    1. Start MongoDB:  docker run -d --name gardenhive-mongo -p 27017:27017 mongo:7"
echo "    2. Seed database:  ./scripts/seed.sh"
echo "    3. Start servers:  ./scripts/start.sh"
