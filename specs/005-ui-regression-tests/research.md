# Research: UI Regression Test Suite

**Branch**: `005-ui-regression-tests` | **Date**: 2026-02-24

---

## Decision 1: E2E Framework — Playwright

**Decision**: Playwright (not Cypress)

**Rationale**:
- **PDF download detection** is the deciding factor. GardenHive uses jsPDF's `pdf.save()` which internally calls `URL.createObjectURL` and programmatically clicks an `<a download>` tag — a fully in-browser operation. Playwright intercepts this at the browser level via `page.waitForEvent('download')`. Cypress has no native download event and cannot intercept `createObjectURL`-based saves at all.
- **Auth state management**: Playwright's `storageState` snapshots `localStorage` + cookies to a JSON file and restores it in ~0ms per test. GardenHive stores auth in `localStorage` keys `gh_token` and `gh_user` — a perfect fit.
- **Docker**: Playwright ships its own browser binaries; the official `mcr.microsoft.com/playwright` Docker image requires no additional system dependencies. Cypress's `cypress/included` image is ~800 MB heavier.
- **Headless reliability**: Playwright's async/await API has no implicit command queue, making async test flows (like waiting for React Query data to load) straightforward.

**Alternatives considered**:
- **Cypress**: Rejected due to inability to detect jsPDF `pdf.save()` downloads without filesystem polling hacks.
- **Puppeteer**: Lower-level than needed; Playwright is a superset with a better test runner built in.

---

## Decision 2: Auth State — `storageState` + Per-Test Fixtures

**Decision**: Two-tier auth strategy:
1. **Shared fixture user** — created once in `global-setup.js`, auth state saved to `tests/e2e/.auth/user.json` via `storageState`. Used for all tests that don't need a pristine account.
2. **Per-test isolated users** — created via `POST /api/auth/register` in a custom Playwright fixture for tests that mutate data (bed creation, harvest logging). Torn down via `DELETE /api/auth/me` in fixture teardown.

**Rationale**: `storageState` costs ~0ms per test (JSON file restore) vs ~200ms for an API login round-trip. Per-test isolated users ensure mutations don't leak between tests. Timestamp + random suffix emails prevent collisions across concurrent workers.

**Alternatives considered**:
- Inject localStorage in every `beforeEach`: Rejected — adds ~200ms login latency per test.
- Single shared account for all tests: Rejected — mutations (bed creation, harvests) leave dirty state that can cause later tests to fail.

---

## Decision 3: Test Data — API-Based Creation, No Direct DB Access

**Decision**: All test data created via the real HTTP API (`POST /api/auth/register`, `POST /api/beds`, etc.) in Playwright fixtures using `request.newContext()`.

**Rationale**:
- Exercises the real API contract — what we're testing.
- Requires zero backend changes.
- API creation is ~50–100ms, fast enough for pre-test setup.
- The existing backend test helpers already use the same timestamp-email pattern.

**Alternatives considered**:
- Direct MongoDB access from tests: Rejected — couples E2E tests to internal DB schema, bypasses the API contract.
- Separate seed endpoint: Rejected — requires backend modification and is not isolated per test.
- Global setup seeding: Rejected — shared mutable state causes inter-test dependencies.

---

## Decision 4: Directory Structure — `tests/e2e/` at Root

**Decision**: `tests/e2e/` at the project root. `playwright.config.js` at the project root alongside `docker-compose.yml`.

**Rationale**: The `CLAUDE.md` constitution already declares `tests/` as a top-level directory. E2E tests are neither backend unit tests nor frontend component tests — they belong to neither subtree. Root-level placement reflects their cross-cutting nature.

**Alternatives considered**:
- `frontend/e2e/`: Rejected — implies tests are frontend-layer concerns; misleading when tests also verify API behaviour.
- `backend/__tests__/e2e/`: Rejected — E2E tests are not Jest tests and should not live in the Jest `__tests__` directory.

---

## Decision 5: webServer Config — None (Docker-managed)

**Decision**: No `webServer` block in `playwright.config.js`. Playwright connects to the already-running Docker stack at `http://localhost:5173`.

**Rationale**: The frontend is served by nginx inside a Docker container (not `vite dev`). Playwright's `webServer` can only manage a single process via an npm command — it cannot start a multi-container Docker stack. The dev stack is started with `./scripts/start.sh` before running tests.

**Alternatives considered**:
- `webServer.command: 'docker compose up'`: Rejected — `webServer` does not handle multi-service readiness correctly; the docker-compose stack takes longer than Playwright's `webServer.timeout` default.

---

## Decision 6: PDF Validation — Filename + Header Check

**Decision**: Verify download via `page.waitForEvent('download')` pattern. Assert on `suggestedFilename()` matching `*.pdf` pattern. Optionally read first 4 bytes from `download.path()` to verify `%PDF` magic bytes.

**Rationale**: Confirms both that the file was triggered and that it is a valid PDF document, without needing to parse the full PDF content.
