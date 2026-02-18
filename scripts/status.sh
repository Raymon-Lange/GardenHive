#!/bin/bash
# status.sh — Show status of all GardenHive services

echo "📊 GardenHive — Service status"
echo ""

# MongoDB
if docker ps --format '{{.Names}}' | grep -q "gardenhive-mongo"; then
  echo "  ✅ MongoDB        running (Docker: gardenhive-mongo)"
else
  echo "  ❌ MongoDB        not running"
fi

# Backend
if fuser 5000/tcp &>/dev/null; then
  echo "  ✅ Backend        running on :5000"
else
  echo "  ❌ Backend        not running"
fi

# Frontend — check ports 5173-5179
FRONTEND_PORT=""
for port in 5173 5174 5175 5176 5177 5178 5179; do
  if fuser $port/tcp &>/dev/null; then
    FRONTEND_PORT=$port
    break
  fi
done

if [ -n "$FRONTEND_PORT" ]; then
  echo "  ✅ Frontend       running on :$FRONTEND_PORT  →  http://localhost:$FRONTEND_PORT"
else
  echo "  ❌ Frontend       not running"
fi

echo ""
