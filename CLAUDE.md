# GardenHive Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-23

## Active Technologies
- Node.js 22 (backend) / React 19 (frontend) + Express 5, Mongoose 9, TanStack React Query 5, React Router 7, Tailwind CSS 3, Lucide React (002-garden-map-snap)
- MongoDB 7 (002-garden-map-snap)
- JavaScript (React 19 JSX), Node.js 22 (003-garden-pdf)
- N/A — PDFs are generated on demand, never stored (003-garden-pdf)
- Node.js 22 (backend) / JavaScript + React 19 (frontend) + Express 5, Mongoose 9, TanStack React Query 5, React Router 7, Tailwind CSS 3, Lucide React (004-guest-planner)
- No new storage — guest state is client-side (`useState` + `sessionStorage` bridge) (004-guest-planner)
- Node.js 22 / JavaScript (ESM) + Playwright 1.x (`@playwright/test`), existing Docker dev stack (005-ui-regression-tests)
- No new storage — tests use the existing dev MongoDB instance via the live API (005-ui-regression-tests)
- Node.js 22 (backend CJS) / React 19 (frontend ESM) + Express 5, Mongoose 9, multer (existing), csv-parse v5 (new — backend only) (006-harvest-csv-import)
- MongoDB 7 — no new collections; existing `Harvest` model covers all fields (006-harvest-csv-import)
- MongoDB 7 — additive `lastLoginAt: Date` field on User model only; no new collections (007-super-admin-stats)
- JavaScript + React 19 (frontend only — no backend changes) + jsPDF 4.2.0 + html2canvas 1.4.1 (both already installed — no new packages needed) (008-improve-garden-pdf)
- N/A — PDF generated in browser memory and downloaded; never persisted (008-improve-garden-pdf)
- JavaScript + React 19 (frontend only — no backend changes) + jsPDF 4.2.0 + html2canvas 1.4.1 (already installed — no changes) (009-simplify-pdf-layout)
- N/A — PDF generated in browser memory; no persistence (009-simplify-pdf-layout)
- JavaScript + React 19 (frontend only — no backend changes) + jsPDF 4.x + html2canvas 1.x (already installed), React Router 7, TanStack React Query 5 (011-standard-guest-plan)
- `localStorage` key `gh_guest_garden` (browser only — no server storage) (011-standard-guest-plan)
- Node.js 22 (backend) / React 19 + JSX (frontend) + Express 5, Mongoose 9, TanStack React Query 5, React Router 7, Tailwind CSS 3, Lucide React, csv-parse 6.x (already installed), multer v2 (already installed) (012-multiple-gardens)
- MongoDB 7 — new `gardens` collection; additive `gardenId` field on `GardenBed`; additive `activeGardenId` on `User` (012-multiple-gardens)
- JavaScript + React 19 (frontend only — no backend changes) + TanStack React Query 5, React Router 7, Lucide React, Tailwind CSS 3 (all already installed) (013-map-garden-switcher)
- N/A — no new storage; existing `User.activeGardenId` persists the active garden (013-map-garden-switcher)
- Node.js 22 (backend) / React 19 + JSX (frontend) + Express 5, Mongoose 9, TanStack React Query 5, React Router 7, Tailwind CSS 3, Lucide React (all already installed — no new packages) (014-bed-planting-ui)
- MongoDB 7 — no new collections; additive write path on existing `GardenBed.cells` (014-bed-planting-ui)

- Node.js 22 (backend) / JavaScript + React 19 (frontend) + Express 5, Mongoose 9, React Router 7, TanStack React (001-existing-features)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test && npm run lint

## Code Style

Node.js 22 (backend) / JavaScript + React 19 (frontend): Follow standard conventions

## Recent Changes
- 014-bed-planting-ui: Added Node.js 22 (backend) / React 19 + JSX (frontend) + Express 5, Mongoose 9, TanStack React Query 5, React Router 7, Tailwind CSS 3, Lucide React (all already installed — no new packages)
- 013-map-garden-switcher: Added JavaScript + React 19 (frontend only — no backend changes) + TanStack React Query 5, React Router 7, Lucide React, Tailwind CSS 3 (all already installed)
- 012-multiple-gardens: Added Node.js 22 (backend) / React 19 + JSX (frontend) + Express 5, Mongoose 9, TanStack React Query 5, React Router 7, Tailwind CSS 3, Lucide React, csv-parse 6.x (already installed), multer v2 (already installed)


<!-- MANUAL ADDITIONS START -->

## New Developer Setup

If someone has just cloned the repo and wants to get the dev environment running, walk them through these steps in order:

**Prerequisites**: Docker (with Compose v2), Node.js 22 (for running tests and Playwright locally).

```bash
# 1. Copy the env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# JWT_SECRET can stay as-is for local dev — just don't use it in production.

# 2. Build the Docker images from source
docker compose -f docker-compose.yml -f docker-compose.dev.yml build

# 3. Start all services (MongoDB + backend + frontend via nginx)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 4. Seed demo data (run once — idempotent, safe to re-run)
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec backend npm run seed:all
```

The app is now at **http://localhost:5173**. Demo login: `mike@gardenhive.com` / `321qaz`.  
Mongo Express (DB browser) is at **http://localhost:8081**.

**Running tests after setup:**

```bash
# Backend unit tests (run inside the container or locally with Node 22 + a running MongoDB)
cd backend && npm test

# Playwright E2E tests (from repo root — requires the dev stack to be running)
npx playwright install --with-deps   # first time only
npx playwright test
```

The E2E suite needs a fixture user. On first run it will be created automatically via `tests/e2e/global-setup.js`.

**Useful dev commands:**

| Task | Command |
|------|---------|
| View backend logs | `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f backend` |
| Restart backend only | `docker compose -f docker-compose.yml -f docker-compose.dev.yml restart backend` |
| Re-seed data | `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec backend npm run seed:all` |
| Stop everything | `docker compose -f docker-compose.yml -f docker-compose.dev.yml down` |
| Rebuild after code changes | `docker compose -f docker-compose.yml -f docker-compose.dev.yml build && docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d` |

## Always Read Before Starting Any Task

- **Constitution**: `.specify/memory/constitution.md` — coding principles, naming conventions, patterns
- **Active spec**: `specs/<feature-branch>/spec.md` — user stories and acceptance criteria
- **Active plan**: `specs/<feature-branch>/plan.md` — technical approach, file paths, constitution check

## Team Rules

- Never modify existing API response shapes without flagging it to the team first
- Always use `async`/`await` — no callbacks or raw `.then()` chains
- New Mongoose model → follow the patterns in `backend/src/models/`
- New API route → follow the patterns in `backend/src/routes/`
- Run `npm test` in `backend/` before **and** after any backend change

<!-- MANUAL ADDITIONS END -->
