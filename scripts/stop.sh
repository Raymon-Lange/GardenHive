#!/bin/bash
# stop.sh — Stop all GardenHive dev servers

echo "🛑 GardenHive — Stopping all services..."

# Kill by PID files if they exist
for pidfile in /tmp/gh-backend.pid /tmp/gh-frontend.pid; do
  if [ -f "$pidfile" ]; then
    PID=$(cat "$pidfile")
    if kill -0 "$PID" 2>/dev/null; then
      kill "$PID" && echo "  Stopped PID $PID"
    fi
    rm -f "$pidfile"
  fi
done

# Kill by process name as fallback
pkill -f "nodemon src/index.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Free ports
fuser -k 5000/tcp 5173/tcp 5174/tcp 5175/tcp 5176/tcp 5177/tcp 5178/tcp 2>/dev/null || true

echo "  ✓ Backend and frontend stopped"
echo ""
echo "  MongoDB container left running (use 'docker stop gardenhive-mongo' to stop it)"
