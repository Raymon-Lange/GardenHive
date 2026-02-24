#!/bin/bash
# test.sh — Run tests for GardenHive
#
# Usage:
#   ./scripts/test.sh              # run all suites
#   ./scripts/test.sh --backend    # backend unit tests only
#   ./scripts/test.sh --frontend   # frontend lint only
#   ./scripts/test.sh --e2e        # E2E tests only
#   ./scripts/test.sh --e2e --headed           # E2E with browser visible
#   ./scripts/test.sh --e2e tests/e2e/auth.spec.js  # single spec file
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RUN_BACKEND=false
RUN_FRONTEND=false
RUN_E2E=false
HEADED=""
SPEC=""
EXPLICIT=false

for arg in "$@"; do
  case "$arg" in
    --backend)  RUN_BACKEND=true;  EXPLICIT=true ;;
    --frontend) RUN_FRONTEND=true; EXPLICIT=true ;;
    --e2e)      RUN_E2E=true;      EXPLICIT=true ;;
    --headed)   HEADED="--headed" ;;
    *)          SPEC="$arg" ;;
  esac
done

# Default: run all suites
if [ "$EXPLICIT" = false ]; then
  RUN_BACKEND=true
  RUN_FRONTEND=true
  RUN_E2E=true
fi

FAILED=()

# ── Backend ────────────────────────────────────────────────────────────────────
if [ "$RUN_BACKEND" = true ]; then
  echo "🌿 GardenHive — Backend tests (Jest)"
  echo "──────────────────────────────────────"
  if (cd "$ROOT/backend" && npm test); then
    echo "  ✓ Backend passed"
  else
    echo "  ✗ Backend failed"
    FAILED+=("backend")
  fi
  echo ""
fi

# ── Frontend ───────────────────────────────────────────────────────────────────
if [ "$RUN_FRONTEND" = true ]; then
  echo "🌿 GardenHive — Frontend lint (no unit tests)"
  echo "──────────────────────────────────────"
  if (cd "$ROOT/frontend" && npm run lint); then
    echo "  ✓ Frontend passed"
  else
    echo "  ✗ Frontend failed"
    FAILED+=("frontend")
  fi
  echo ""
fi

# ── E2E ────────────────────────────────────────────────────────────────────────
if [ "$RUN_E2E" = true ]; then
  echo "🌿 GardenHive — E2E tests (Playwright)"
  echo "──────────────────────────────────────"
  echo "  Stack must be running: ./scripts/start.sh"
  echo ""
  if npx playwright test $HEADED $SPEC; then
    echo "  ✓ E2E passed"
  else
    echo "  ✗ E2E failed"
    FAILED+=("e2e")
  fi
  echo ""
fi

# ── Summary ────────────────────────────────────────────────────────────────────
if [ ${#FAILED[@]} -eq 0 ]; then
  echo "  ✓ All suites passed"
else
  echo "  ✗ Failed: ${FAILED[*]}"
  exit 1
fi
