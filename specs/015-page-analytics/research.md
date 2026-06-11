# Research: Page Analytics Tracking

**Feature**: 015-page-analytics  
**Date**: 2026-06-11

---

## Decision 1: SPA Route Change Tracking

**Decision**: No extra configuration needed — Umami automatically tracks client-side navigation.

**Rationale**: Umami's tracker script hooks into the browser's `pushState` and `replaceState` History API methods. React Router 7 uses these same APIs for client-side navigation, so every route change is automatically captured as a new page view without any additional code.

**Alternatives considered**: Manually calling `umami.track()` on each route change via a React Router listener — rejected because Umami handles this natively, adding manual calls would double-count page views.

---

## Decision 2: Script placement — `<head>` vs `<body>`

**Decision**: Place script tag in `<head>` with `defer` attribute.

**Rationale**: The `defer` attribute causes the browser to download the script in parallel with HTML parsing and execute it after the DOM is ready, preventing any render-blocking. Placing it in `<head>` ensures Umami initialises as early as possible so the very first page view (initial load) is recorded before user interaction. The `defer` attribute is already present in the user-supplied script tag.

**Alternatives considered**: Bottom of `<body>` — acceptable but `defer` in `<head>` is the modern equivalent and is what Umami's own documentation recommends.

---

## Decision 3: Environment handling (dev vs. production)

**Decision**: Single script tag in `index.html` with no environment branching.

**Rationale**: The analytics host (`https://analytics.fire-hive.com`) is publicly accessible. Tracking dev/local visits is low noise given this is a personal project, and the simpler approach avoids environment-specific HTML or build-time conditionals. If dev traffic becomes noise in the dashboard, Umami has a built-in "ignore" feature via a `localStorage` flag (`umami.disabled = 1`) that can be toggled manually.

**Alternatives considered**: `VITE_` env variable to conditionally inject the script — rejected per YAGNI; adds build complexity for negligible benefit at current scale.

---

## Conclusion

Implementation is a single-line addition to `frontend/index.html`. No backend changes, no new packages, no environment branching required.
