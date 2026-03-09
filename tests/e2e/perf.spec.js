/**
 * Performance — Page Load & API Response Times
 *
 * Thresholds (all p95 targets for a local dev stack):
 *   - domContentLoaded  < 1500ms  (proxy for TTI on a pre-built SPA)
 *   - loadEventEnd      < 3000ms  (all assets fetched)
 *   - API reads         < 500ms
 *   - API auth          < 300ms
 *   - Bed write         < 500ms
 *
 * Uses the default storageState (fixture user) — no destructive writes except
 * the one cell-write test which uses an isolatedPage.
 *
 * Notes:
 *   - Navigation Timing is read via page.evaluate() after the page settles.
 *   - API timings are captured with page.on('response') before navigation.
 *   - All timing assertions use soft expects so the full report is visible on failure.
 */

import { test, expect } from './fixtures/index.js';

// Allow one retry for timing tests — transient Docker load spikes should not count as failures.
test.describe.configure({ retries: 1 });

const THRESHOLDS = {
  domContentLoaded: 1500,
  loadEventEnd: 3000,
  apiAuth: 300,
  apiRead: 500,
  apiWrite: 500,
  // Looser budget for dashboard — requests fire while the full suite is under load
  apiDashboard: 750,
};

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Returns Navigation Timing metrics after the page has fully loaded.
 * @param {import('@playwright/test').Page} page
 */
async function getNavTiming(page) {
  return page.evaluate(() => {
    const [entry] = performance.getEntriesByType('navigation');
    return {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.startTime,
      loadEventEnd: entry.loadEventEnd - entry.startTime,
    };
  });
}

/**
 * Collects response timings (in ms) for API paths matching a pattern.
 * Must be called BEFORE page.goto().
 *
 * @param {import('@playwright/test').Page} page
 * @param {RegExp} urlPattern
 * @returns {{ stop: () => Map<string, number> }}
 */
function collectApiTimings(page, urlPattern) {
  const timings = new Map();
  const startTimes = new Map();

  page.on('request', (req) => {
    if (urlPattern.test(req.url())) {
      startTimes.set(req.url(), Date.now());
    }
  });

  page.on('response', (res) => {
    const url = res.url();
    if (urlPattern.test(url) && startTimes.has(url)) {
      timings.set(url, Date.now() - startTimes.get(url));
    }
  });

  return { timings };
}

// ── Page load — key routes ────────────────────────────────────────────────────

for (const route of ['/dashboard', '/map', '/beds', '/harvests', '/analytics']) {
  test(`page load within thresholds — ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'load' });

    const timing = await getNavTiming(page);

    expect.soft(timing.domContentLoaded, `domContentLoaded on ${route}`).toBeLessThan(THRESHOLDS.domContentLoaded);
    expect.soft(timing.loadEventEnd, `loadEventEnd on ${route}`).toBeLessThan(THRESHOLDS.loadEventEnd);
  });
}

// ── API response times — read endpoints ──────────────────────────────────────

test('API — /api/ calls on dashboard load all respond within threshold', async ({ page }) => {
  // The app reads auth from localStorage (storageState fixture), so /auth/me is not
  // called on load. This test asserts that any API calls made during dashboard
  // initialisation (e.g. gardens, beds, harvests summary) stay within threshold.
  const { timings } = collectApiTimings(page, /\/api\//);

  await page.goto('/dashboard', { waitUntil: 'networkidle' });

  for (const [url, ms] of timings) {
    expect.soft(ms, `GET ${url}`).toBeLessThan(THRESHOLDS.apiDashboard);
  }

  // Dashboard may make zero API calls if all state is in localStorage — that is fine.
  // The test still validates timings for any calls that do fire.
});

test('API — /beds responds within threshold on map load', async ({ page }) => {
  const { timings } = collectApiTimings(page, /\/api\/beds/);

  await page.goto('/map', { waitUntil: 'networkidle' });

  for (const [url, ms] of timings) {
    expect.soft(ms, `GET ${url}`).toBeLessThan(THRESHOLDS.apiRead);
  }

  expect(timings.size, 'Expected at least one /api/beds call').toBeGreaterThan(0);
});

test('API — /harvests responds within threshold on harvests load', async ({ page }) => {
  const { timings } = collectApiTimings(page, /\/api\/harvests/);

  await page.goto('/harvests', { waitUntil: 'networkidle' });

  for (const [url, ms] of timings) {
    expect.soft(ms, `GET ${url}`).toBeLessThan(THRESHOLDS.apiRead);
  }

  expect(timings.size, 'Expected at least one /api/harvests call').toBeGreaterThan(0);
});

// ── API response time — write endpoint ───────────────────────────────────────

test('API — PUT /beds/:id/cells responds within threshold', async ({ isolatedPage }) => {
  const { token } = isolatedPage;

  const API_URL = process.env.API_URL ?? process.env.BASE_URL ?? 'http://localhost:5173';

  // Create a bed to write to
  const meRes = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const user = await meRes.json();
  const gardenId = user.activeGardenId;

  const bedRes = await fetch(`${API_URL}/api/beds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'Perf Write Bed', rows: 3, cols: 3, gardenId }),
  });
  const bed = await bedRes.json();

  const plantsRes = await fetch(`${API_URL}/api/plants/public`);
  const plants = await plantsRes.json();
  const plant = plants[0];

  const start = Date.now();
  const writeRes = await fetch(`${API_URL}/api/beds/${bed._id}/cells`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ row: 0, col: 0, plantId: plant._id }),
  });
  const elapsed = Date.now() - start;

  expect(writeRes.ok, 'Cell write should succeed').toBe(true);
  expect(elapsed, 'PUT /beds/:id/cells response time').toBeLessThan(THRESHOLDS.apiWrite);
});

// ── Garden map render time ────────────────────────────────────────────────────

test('garden map — grid is interactive within 4s of navigation start', async ({ page }) => {
  // Threshold is 4s for a local Docker stack — the fixture user has 10 seeded beds
  // with hundreds of cells which is heavier than a typical real user session.
  const start = Date.now();

  await page.goto('/map');

  // Wait for the map to become interactive — either the "Add bed" button (configured user)
  // or the garden dimensions modal (new/fixture user). Both confirm the page has rendered.
  await Promise.race([
    page.getByRole('button', { name: 'Add bed' }).waitFor({ state: 'visible', timeout: 4000 }),
    page.getByText('Set your garden size').waitFor({ state: 'visible', timeout: 4000 }),
  ]);

  const elapsed = Date.now() - start;

  expect(elapsed, 'Time to interactive garden map').toBeLessThan(4000);
});
