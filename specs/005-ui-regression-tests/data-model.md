# Data Model: UI Regression Test Suite

**Branch**: `005-ui-regression-tests` | **Date**: 2026-02-24

No new persistent data models are introduced by this feature. The E2E suite uses existing API endpoints and existing Mongoose models.

This document describes the **test data shapes** — the structures created by test fixtures at runtime.

---

## Test Data Entities

### Fixture User (shared, long-lived)

Created once in `global-setup.js`. Used for read-heavy tests (navigation, analytics, guest planner).

```js
{
  name:     'E2E Fixture',
  email:    'e2e-fixture@test.local',   // fixed email, created once
  password: 'TestPass123',
  role:     'owner',
  // After creation, auth state saved to tests/e2e/.auth/user.json
  // Contains: { origins: [{ origin: 'http://localhost:5173', localStorage: [...] }] }
}
```

### Isolated Test User (per-test, short-lived)

Created in the `isolatedPage` fixture's setup, deleted in teardown via `DELETE /api/auth/me`.

```js
{
  name:     'E2E Isolated',
  email:    `e2e-${Date.now()}-${randomSuffix}@test.local`,  // unique per run
  password: 'TestPass123',
  role:     'owner',
}
```

### Test Bed (created by beds suite)

```js
// POST /api/beds
{
  name: 'E2E Test Bed',
  rows: 3,
  cols: 3,
}
// After creation → PUT /api/beds/:id/cells to assign a plant
```

### Test Harvest (created by harvests suite)

```js
// POST /api/harvests
{
  plantId:     '<id of a system plant>',
  quantity:    2,
  unit:        'kg',
  harvestedAt: new Date().toISOString(),
}
```

---

## Auth State File

Playwright `storageState` serialisation format (written to `tests/e2e/.auth/user.json`):

```json
{
  "cookies": [],
  "origins": [
    {
      "origin": "http://localhost:5173",
      "localStorage": [
        { "name": "gh_token", "value": "<jwt>" },
        { "name": "gh_user",  "value": "<json-serialised user object>" }
      ]
    }
  ]
}
```

This file is `.gitignore`d — it contains a live JWT and must not be committed.

---

## Data Flow

```
global-setup.js
  └── POST /api/auth/login (fixture user)
        └── page.evaluate → localStorage.setItem('gh_token', ...)
              └── storageState → tests/e2e/.auth/user.json

isolatedPage fixture (per test)
  └── POST /api/auth/register  (unique email)
        └── page.evaluate → localStorage injection
              └── [test runs]
                    └── DELETE /api/auth/me (fixture teardown)
```
