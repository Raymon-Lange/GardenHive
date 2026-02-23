# GardenHive Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-23

## Active Technologies
- Node.js 22 (backend) / React 19 (frontend) + Express 5, Mongoose 9, TanStack React Query 5, React Router 7, Tailwind CSS 3, Lucide React (002-garden-map-snap)
- MongoDB 7 (002-garden-map-snap)
- JavaScript (React 19 JSX), Node.js 22 (003-garden-pdf)
- N/A — PDFs are generated on demand, never stored (003-garden-pdf)

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
- 003-garden-pdf: Added JavaScript (React 19 JSX), Node.js 22
- 002-garden-map-snap: Added Node.js 22 (backend) / React 19 (frontend) + Express 5, Mongoose 9, TanStack React Query 5, React Router 7, Tailwind CSS 3, Lucide React

- 001-existing-features: Added Node.js 22 (backend) / JavaScript + React 19 (frontend) + Express 5, Mongoose 9, React Router 7, TanStack React

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
