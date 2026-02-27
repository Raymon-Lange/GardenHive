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
- 009-simplify-pdf-layout: Added JavaScript + React 19 (frontend only — no backend changes) + jsPDF 4.2.0 + html2canvas 1.4.1 (already installed — no changes)
- 008-improve-garden-pdf: Added JavaScript + React 19 (frontend only — no backend changes) + jsPDF 4.2.0 + html2canvas 1.4.1 (both already installed — no new packages needed)
- 007-super-admin-stats: Added Node.js 22 (backend) / JavaScript + React 19 (frontend) + Express 5, Mongoose 9, TanStack React Query 5, React Router 7, Tailwind CSS 3, Lucide React


<!-- MANUAL ADDITIONS START -->

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
