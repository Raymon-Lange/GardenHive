---
description: Run backend unit tests and Playwright E2E tests, then print a combined pass/fail summary
---

Run the GardenHive test suite in two phases — backend unit tests first, then Playwright E2E tests. The dev stack (Docker) must already be running for E2E tests. If it is not, run `/dev.reload` first.

---

## Phase 1 — Backend unit tests

Run from the `backend/` directory:

```bash
cd /home/raymon/Documents/code/GardenHive/backend && npm test 2>&1
```

Print the full output. Note whether all tests passed or which suites failed.

---

## Phase 2 — Playwright E2E tests

Run from the repo root:

```bash
cd /home/raymon/Documents/code/GardenHive && npx playwright test 2>&1
```

Print the full output. If any tests fail, print the failure details.

To run a single spec file instead of the full suite, the user can pass a filename argument, e.g. `/dev.test tests/e2e/map.spec.js`. If an argument was provided, append it to the playwright command:

```bash
cd /home/raymon/Documents/code/GardenHive && npx playwright test <argument> 2>&1
```

---

## Summary

After both phases complete, print a summary table:

| Phase | Result | Detail |
|-------|--------|--------|
| Backend unit tests | PASS / FAIL | X passed, Y failed |
| Playwright E2E | PASS / FAIL | X passed, Y failed, Z skipped |

- If any phase failed, list the failing test names clearly.
- Remind the user they can view the full Playwright HTML report with:
  ```bash
  npx playwright show-report
  ```
- If the E2E tests could not connect to the app (network error / no server), note that the dev stack may not be running and suggest `/dev.reload`.
