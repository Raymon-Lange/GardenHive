/**
 * US11 — Standard Guest Planner (multi-bed, localStorage-persisted)
 *
 * Tests: public access, plant picker, sign-up carry-over, landing page CTA, plan persistence
 *
 * All tests use unauthenticated browser contexts (storageState: undefined).
 *
 * Selector notes:
 *   - Page heading: h1 "Free Garden Planner"
 *   - Add bed button: button with text "Add bed"
 *   - Bed name input: placeholder "e.g. Raised Bed 1"
 *   - Bed tile on garden grid: div with title ending in "— click to plant"
 *   - Cell editor cells: button with title "Click to add plant"
 *   - Sign up to save: button text "Sign up to save"
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const API_URL  = process.env.API_URL ?? BASE_URL;

// Override global storageState — all tests in this file are unauthenticated
test.use({ storageState: undefined });

test('guest can access /planner without being redirected to login', async ({ page }) => {
  await page.goto('/planner');

  await expect(page).not.toHaveURL(/\/login/);
  // New multi-bed planner heading should be visible (not the old rows/cols setup form)
  await expect(page.getByRole('heading', { name: 'Free Garden Planner' })).toBeVisible();
  // Add bed entry point must be present
  await expect(page.getByRole('button', { name: /add bed/i })).toBeVisible();
});

test('plant picker opens when clicking a cell after adding a bed', async ({ page }) => {
  await page.goto('/planner');

  // Open add-bed form and create a bed
  await page.getByRole('button', { name: /add bed/i }).click();
  await page.getByPlaceholder('e.g. Raised Bed 1').fill('Test Bed');
  await page.getByRole('button', { name: 'Add' }).click();

  // Click the bed tile on the garden grid to open the cell editor modal
  await page.locator('[title$="— click to plant"]').first().click();

  // Cell editor modal should show the bed name
  await expect(page.getByRole('heading', { name: 'Test Bed', level: 2 })).toBeVisible();

  // Click the first empty cell inside the modal
  await page.locator('button[title="Click to add plant"]').first().click();

  // Plant picker dialog should appear
  await expect(page.getByText('Choose a plant')).toBeVisible();
});

test('sign-up carry-over — guest garden beds saved to new account', async ({ page }) => {
  await page.goto('/planner');

  // Add two beds
  await page.getByRole('button', { name: /add bed/i }).click();
  await page.getByPlaceholder('e.g. Raised Bed 1').fill('Bed A');
  await page.getByRole('button', { name: 'Add' }).click();

  await page.getByRole('button', { name: /add bed/i }).click();
  await page.getByPlaceholder('e.g. Raised Bed 1').fill('Bed B');
  await page.getByRole('button', { name: 'Add' }).click();

  // Beds are now persisted to localStorage — navigate to sign up
  await page.getByRole('button', { name: /sign up to save/i }).click();
  await expect(page).toHaveURL(/\/signup/);

  // Complete registration
  const uniqueEmail = `e2e-guest-carryover-${Date.now()}@test.local`;
  await page.locator('button').filter({ hasText: 'Garden Owner' }).click();
  await page.getByPlaceholder('Your name').fill('E2E Guest User');
  await page.getByPlaceholder('you@example.com').fill(uniqueEmail);
  await page.getByPlaceholder('At least 6 characters').fill('TestPass123');
  await page.getByRole('button', { name: 'Create account' }).click();

  // Should land on /map (not /beds/:id as in the old single-bed planner)
  await expect(page).toHaveURL(/\/map/);

  // Verify carry-over localStorage key has been cleared
  const guestGarden = await page.evaluate(() => localStorage.getItem('gh_guest_garden'));
  expect(guestGarden).toBeNull();

  // Teardown: delete the newly created account
  const newToken = await page.evaluate(() => localStorage.getItem('gh_token'));
  if (newToken) {
    await fetch(`${API_URL}/api/auth/me`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${newToken}` },
      body: JSON.stringify({ password: 'TestPass123' }),
    });
  }
});

test('landing page CTA links to /planner', async ({ page }) => {
  await page.goto('/');

  // "Try free planner" link should be visible without scrolling
  const cta = page.getByRole('link', { name: /try free planner/i });
  await expect(cta).toBeVisible();

  await cta.click();
  await expect(page).toHaveURL(/\/planner/);
});

test('plan persists after page reload', async ({ page }) => {
  await page.goto('/planner');

  // Add a bed
  await page.getByRole('button', { name: /add bed/i }).click();
  await page.getByPlaceholder('e.g. Raised Bed 1').fill('Persistent Bed');
  await page.getByRole('button', { name: 'Add' }).click();

  // Verify the bed tile is on the garden grid
  await expect(page.locator('[title="Persistent Bed — click to plant"]')).toBeVisible();

  // Reload the page — bed must survive via localStorage
  await page.reload();
  await expect(page.locator('[title="Persistent Bed — click to plant"]')).toBeVisible();
});
