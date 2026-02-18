#!/bin/bash
# start.sh — Start MongoDB, backend, and frontend dev servers
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🌿 GardenHive — Starting all services..."

# MongoDB via Docker
if ! docker ps --format '{{.Names}}' | grep -q "gardenhive-mongo"; then
  if docker ps -a --format '{{.Names}}' | grep -q "gardenhive-mongo"; then
    echo "  Starting existing MongoDB container..."
    docker start gardenhive-mongo
  else
    echo "  Creating new MongoDB container..."
    docker run -d --name gardenhive-mongo -p 27017:27017 mongo:7
  fi
else
  echo "  ✓ MongoDB already running"
fi

sleep 2

# Backend
echo "  Starting backend..."
cd "$ROOT/backend"
npm run dev > /tmp/gh-backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/gh-backend.pid

sleep 2

# Frontend
echo "  Starting frontend..."
cd "$ROOT/frontend"
npm run dev > /tmp/gh-frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/gh-frontend.pid

sleep 3

# Print URLs
FRONTEND_URL=$(grep -o "http://localhost:[0-9]*" /tmp/gh-frontend.log | head -1)
echo ""
echo "  ✓ Backend:  http://localhost:5000"
echo "  ✓ Frontend: $FRONTEND_URL"
echo ""
echo "  Logs:  ./scripts/logs.sh"
echo "  Stop:  ./scripts/stop.sh"
