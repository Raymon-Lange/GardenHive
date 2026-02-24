# Research: Guest Garden Planner

**Branch**: `004-guest-planner` | **Date**: 2026-02-24

---

## 1. Plant Library — Public Endpoint

**Decision**: Add `GET /api/plants/public` — no auth required, returns only system plants (`ownerId: null`).

**Rationale**: The existing `GET /api/plants` requires auth and merges system plants with the requesting user's custom plants and their hidden-plant filter. A dedicated public endpoint is clean, safe, and exposes no user data.

**Implementation**: New route added in `backend/src/routes/plants.js` **before** the `requireAuth` routes. One DB query: `Plant.find({ ownerId: null }).sort({ name: 1 })`.

**Alternatives considered**:
- Make `GET /api/plants` conditionally public (optional auth) — rejected; complicates the existing route and risks leaking user data.

---

## 2. PDF Generation — Reuse GardenPrintView

**Decision**: Reuse the existing `GardenPrintView` component. Pass the guest bed with `mapRow: 0, mapCol: 0` and set `gardenWidth = bed.cols`, `gardenHeight = bed.rows`. The guest can optionally name their plan; defaults to "My Garden Plan".

**Rationale**: `GardenPrintView` renders any array of beds with `mapRow != null`. A single guest bed at (0,0) filling the full garden space satisfies this contract with zero changes to the component.

**Implementation**: `handleDownloadPdf` logic replicated from `GardenMap.jsx` into `GuestPlanner.jsx`. Not extracted to a shared utility — only used in two places (Constitution Principle VII: extract at 3+).

**Alternatives considered**:
- Build a guest-specific PDF component — rejected (YAGNI; existing component handles this correctly).

---

## 3. Guest Bed State — Client-Side + sessionStorage Bridge

**Decision**: Guest bed lives in `useState` inside `GuestPlanner.jsx`. On "Sign up to save", the bed is written to `sessionStorage` before navigating to `/signup`. After successful registration, `Signup.jsx` reads and saves the bed via the standard beds API, then clears the key.

**Rationale**: `useState` is the correct tool for transient UI state (Constitution Principle V). `sessionStorage` provides a tab-scoped, automatically cleared bridge — no persistence beyond the session, no cleanup burden.

**Data shape stored in sessionStorage**:
```json
{
  "name": "My Raised Bed",
  "rows": 4,
  "cols": 3,
  "cells": [
    { "row": 0, "col": 0, "plant": { "_id": "...", "name": "Tomato", "emoji": "🍅", ... } }
  ]
}
```

**Alternatives considered**:
- localStorage — rejected; persists beyond session, violates "no persistence" principle.
- Prompt only (no carry-over) — rejected; losing the designed layout at the sign-up step is a friction point that reduces conversion.

---

## 4. Routing — Public /planner Route

**Decision**: Add `<Route path="/planner" element={<GuestPlanner />} />` to `App.jsx` without a `<PrivatePage>` wrapper, alongside `/login` and `/signup`.

**Rationale**: The planner must be accessible without authentication. No structural changes to existing routes.

---

## 5. Layout — AppLayout with Null-Safe User

**Decision**: Wrap `GuestPlanner` in `AppLayout` directly (no `ProtectedRoute`). `AppLayout` must handle a null user gracefully — hide profile-specific elements or show "Guest" where the user name appears. Sidebar links to protected routes will redirect to `/login` when clicked, which is acceptable.

**Rationale**: Reuses the existing shell for visual consistency. Minimal defensive changes to `AppLayout`.

---

## 6. Landing Page CTA

**Decision**: Add a secondary "Try Free Planner" button (outlined/ghost style) in the hero section of `Landing.jsx`, alongside the existing "Start for free" primary CTA.

**Rationale**: Hero is the highest-visibility section; visible without scrolling on all viewports (SC-004). Secondary styling preserves the sign-up conversion hierarchy.
