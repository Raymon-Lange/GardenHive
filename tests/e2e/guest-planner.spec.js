/**
 * US4 — Guest Planner
 *
 * Tests: public access, plant picker, sign-up carry-over, landing page CTA
 *
 * All tests use unauthenticated browser contexts (storageState: undefined).
 *
 * Selector notes:
 *   - Rows/Cols inputs: placeholder "e.g. 4" / "e.g. 3"
 *   - Bed cells: <button class="w-14 h-14 ...">
 *   - Sign up to save: button with text "Sign up to save"
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const API_URL = process.env.API_URL ?? BASE_URL;

// Override global storageState — all tests in this file are unauthenticated
test.use({ storageState: undefined });

test('guest can access /planner without being redirected to login', async ({ page }) => {
  await page.goto('/planner');

  await expect(page).not.toHaveURL(/\/login/);
  // Setup form should be visible (rows and columns inputs)
  await expect(page.getByPlaceholder('e.g. 4')).toBeVisible();
  await expect(page.getByPlaceholder('e.g. 3')).toBeVisible();
});

test('plant picker opens when clicking a cell after setup', async ({ page }) => {
  await page.goto('/planner');

  await page.getByPlaceholder('e.g. 4').fill('3');
  await page.getByPlaceholder('e.g. 3').fill('3');
  await page.getByRole('button', { name: 'Start planning' }).click();

  // Grid should be visible — cells are <button class="w-14 h-14 ...">
  const cell = page.locator('button').filter({ hasText: '+' }).first();
  await expect(cell).toBeVisible();
  await cell.click();

  // Plant picker dialog should appear
  await expect(page.getByText('Choose a plant')).toBeVisible();
});

test('sign-up carry-over — planted grid is saved to new account', async ({ page }) => {
  await page.goto('/planner');

  // Set up the grid
  await page.getByPlaceholder('e.g. 4').fill('3');
  await page.getByPlaceholder('e.g. 3').fill('3');
  await page.getByRole('button', { name: 'Start planning' }).click();

  // Click the first empty cell to open the plant picker
  await page.locator('button').filter({ hasText: '+' }).first().click();
  await expect(page.getByText('Choose a plant')).toBeVisible();

  // Click the first plant in the list
  await page.locator('button').filter({ hasText: /\p{Emoji}/u }).first().click();

  // At least one "Sign up to save" button should now be visible (there may be two — banner + header)
  await expect(page.getByRole('button', { name: /sign up to save/i }).first()).toBeVisible();

  // Click the primary "Sign up to save" button (btn-primary variant)
  await page.getByRole('button', { name: /sign up to save/i }).last().click();

  await expect(page).toHaveURL(/\/signup/);

  // Complete registration
  const uniqueEmail = `e2e-guest-carryover-${Date.now()}@test.local`;
  await page.locator('button').filter({ hasText: 'Garden Owner' }).click();
  await page.getByPlaceholder('Your name').fill('E2E Guest User');
  await page.getByPlaceholder('you@example.com').fill(uniqueEmail);
  await page.getByPlaceholder('At least 6 characters').fill('TestPass123');
  await page.getByRole('button', { name: 'Create account' }).click();

  // Should land on /beds/:id (the newly created bed from the guest session)
  await expect(page).toHaveURL(/\/beds\//);

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
