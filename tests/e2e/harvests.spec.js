/**
 * US3 — Harvest Logging
 *
 * Tests: log harvest, view harvests, analytics page loads
 *
 * All tests use the isolatedPage fixture.
 * beforeEach seeds: garden dimensions + bed + plant assignment.
 *
 * Selector notes:
 *   - Plant selector is a <select> element; use selectOption({ value: plantId })
 *   - Quantity input has placeholder "0"
 */

import { test, expect } from './fixtures/index.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const API_URL = process.env.API_URL ?? BASE_URL;

let seedPlant;

test.beforeEach(async ({ isolatedPage }) => {
  const { token, page } = isolatedPage;
  seedPlant = undefined;

  const gardenRes = await fetch(`${API_URL}/api/auth/me/garden`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ gardenWidth: 10, gardenHeight: 8 }),
  });
  const updatedUser = await gardenRes.json();
  await page.evaluate((u) => { localStorage.setItem('gh_user', JSON.stringify(u)); }, updatedUser);

  const bedRes = await fetch(`${API_URL}/api/beds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'E2E Harvest Bed', rows: 3, cols: 3 }),
  });
  const bed = await bedRes.json();

  const plantsRes = await fetch(`${API_URL}/api/plants/public`);
  const plants = await plantsRes.json();
  seedPlant = plants[0];

  await fetch(`${API_URL}/api/beds/${bed._id}/cells`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ row: 0, col: 0, plantId: seedPlant._id }),
  });
});

test('log harvest — new entry appears in list with plant name and quantity', async ({ isolatedPage }) => {
  const { page } = isolatedPage;

  await page.goto('/harvests');

  // Select the seeded plant by its ID value (option text includes emoji + name)
  await page.locator('select').first().selectOption({ value: seedPlant._id });

  // Enter quantity (placeholder "0")
  await page.getByPlaceholder('0').fill('2');

  await page.getByRole('button', { name: 'Log harvest' }).click();

  // Entry should appear in the "Recent harvests" table — look in table cells, not select options
  await expect(page.locator('tbody td, [role="row"]').getByText(seedPlant.name).first()).toBeVisible();
  await expect(page.locator('tbody td, [role="row"]').getByText('2').first()).toBeVisible();
});

test('view harvests — pre-created entry shows plant name, quantity, and date', async ({ isolatedPage }) => {
  const { page, token } = isolatedPage;

  await fetch(`${API_URL}/api/harvests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      plantId: seedPlant._id,
      quantity: 3,
      unit: 'kg',
      harvestedAt: new Date().toISOString(),
    }),
  });

  await page.goto('/harvests');

  await expect(page.locator('tbody td, [role="row"]').getByText(seedPlant.name).first()).toBeVisible();
  await expect(page.locator('tbody td, [role="row"]').getByText('3').first()).toBeVisible();
  // A recognisable date value for the current year
  await expect(
    page.locator('tbody td, [role="row"]').getByText(new RegExp(new Date().getFullYear().toString())).first()
  ).toBeVisible();
});

test('analytics page loads without error and shows harvest data', async ({ isolatedPage }) => {
  const { page, token } = isolatedPage;

  await fetch(`${API_URL}/api/harvests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      plantId: seedPlant._id,
      quantity: 5,
      unit: 'kg',
      harvestedAt: new Date().toISOString(),
    }),
  });

  await page.goto('/analytics');

  // Page should not show an error state
  await expect(page.getByText(/something went wrong|error loading/i)).not.toBeVisible();

  // Page title or a chart heading should be present
  await expect(page.getByRole('heading', { name: /analytics/i }).first()).toBeVisible();
});
