#!/bin/bash
# logs.sh — Tail live logs from all services (or a specific one)
# Usage:
#   ./scripts/logs.sh             — all services
#   ./scripts/logs.sh backend     — backend only
#   ./scripts/logs.sh frontend    — frontend only

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SERVICE=${1:-""}
docker compose logs -f $SERVICE
