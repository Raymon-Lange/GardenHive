# Implementation Plan: Page Analytics Tracking

**Branch**: `015-page-analytics` | **Date**: 2026-06-11 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/015-page-analytics/spec.md`

## Summary

Add a self-hosted Umami analytics script tag to `frontend/index.html` so that every page view (including SPA client-side navigations) is recorded in the Umami dashboard at `https://analytics.fire-hive.com`. This is a single-file, frontend-only change with no backend involvement.

## Technical Context

**Language/Version**: JavaScript + React 19 (frontend only)  
**Primary Dependencies**: No new dependencies — Umami script loaded from external host via `<script>` tag  
**Storage**: N/A — analytics data stored on Umami server, not in the app  
**Testing**: Playwright 1.x (E2E verification that script tag is present in rendered HTML)  
**Target Platform**: Browser (served by Vite 7 / nginx)  
**Project Type**: Web application  
**Performance Goals**: Script must not block initial render (`defer` attribute ensures this)  
**Constraints**: No cookies; no PII in tracked data  
**Scale/Scope**: Single `index.html` change; affects all pages

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Layered Separation | ✅ Pass | Frontend-only; no business logic added |
| II. REST-First API Design | ✅ N/A | No API changes |
| III. Permission-Gated Multi-Tenancy | ✅ Pass | Analytics records page paths only — no user identity exposed |
| IV. Schema-Validated Data Integrity | ✅ N/A | No model changes |
| V. Server State via React Query | ✅ N/A | Umami script is independent of app state management |
| VI. Test-Before-Deploy | ✅ Pass | No backend changes; E2E smoke test verifies script tag presence |
| VII. Simplicity & YAGNI | ✅ Pass | Smallest possible change — one `<script>` line in HTML |
| VIII. Naming & Code Style | ✅ N/A | HTML attribute only; no JS written |

**No violations — no Complexity Tracking required.**

## Project Structure

### Documentation (this feature)

```text
specs/015-page-analytics/
├── plan.md          ← this file
├── research.md      ← Phase 0 (complete)
├── data-model.md    ← N/A (no data model changes)
├── contracts/       ← N/A (no API changes)
└── tasks.md         ← Phase 2 output (/speckit.tasks)
```

### Source Code (changed files)

```text
frontend/
└── index.html       ← add Umami <script> tag to <head>
```

## Implementation

### Step 1 — Add analytics script to `frontend/index.html`

Add to the `<head>` section, before the closing `</head>` tag:

```html
<script defer src="https://analytics.fire-hive.com/script" data-website-id="ef71b5f0-456e-4d2a-9050-28985fb5e8cc"></script>
```

**Result**: `frontend/index.html` head section becomes:

```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GardenHive</title>
  <script defer src="https://analytics.fire-hive.com/script" data-website-id="ef71b5f0-456e-4d2a-9050-28985fb5e8cc"></script>
</head>
```

That is the only code change required.

### Step 2 — Verify (manual)

1. Rebuild the frontend container (or restart dev stack).
2. Open GardenHive in a browser and navigate between pages.
3. Open the Umami dashboard at `https://analytics.fire-hive.com` and confirm page views appear.
4. Open browser DevTools → Application → Cookies: confirm no tracking cookies are set by the analytics script.

## No contracts, data model, or quickstart needed

This feature has no API surface changes, no new entities, and no setup steps beyond the single-line HTML edit above.
