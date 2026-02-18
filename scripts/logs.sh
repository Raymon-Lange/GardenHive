#!/bin/bash
# logs.sh — Tail live logs from backend and frontend
# Requires: multitail (install with: sudo apt install multitail)
# Falls back to showing backend log if multitail isn't installed

if command -v multitail &> /dev/null; then
  multitail -l "tail -f /tmp/gh-backend.log" -l "tail -f /tmp/gh-frontend.log"
else
  echo "  Tip: install multitail for split-pane logs: sudo apt install multitail"
  echo "  Showing backend log (Ctrl+C to exit, then check frontend: tail -f /tmp/gh-frontend.log)"
  echo ""
  echo "=== BACKEND ==="
  tail -f /tmp/gh-backend.log &
  echo ""
  echo "=== FRONTEND ==="
  tail -f /tmp/gh-frontend.log
fi
