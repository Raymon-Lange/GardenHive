/**
 * US1 — Authentication Flows
 *
 * Tests: valid login, logout, protected redirect, signup, wrong password
 *
 * The logout test uses the default storageState (fixture user, logged in).
 * All other tests create fresh unauthenticated contexts via browser.newContext().
 *
 * Note: Login/Signup inputs use placeholder-based selectors because the form labels
 * don't have htmlFor/id associations.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const API_URL = process.env.API_URL ?? BASE_URL;

test('valid login navigates to dashboard', async ({ browser }) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();

  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill('e2e-fixture@test.local');
  await page.getByPlaceholder('••••••••').fill('TestPass123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard/);

  await context.close();
});

test('logout redirects away from dashboard and blocks re-entry', async ({ page }) => {
  // Starts logged in as fixture user (default storageState)
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole('button', { name: 'Sign out' }).click();

  // App navigates away from /dashboard (to / or /login — both are valid)
  await expect(page).not.toHaveURL(/\/dashboard/);

  // After logout, /dashboard should be protected and redirect to /login
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});

test('protected route redirects unauthenticated user to login', async ({ browser }) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);

  await context.close();
});

test('signup with new email lands on dashboard', async ({ browser }) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();

  const uniqueEmail = `e2e-signup-${Date.now()}@test.local`;

  await page.goto('/signup');

  // Select "Garden Owner" role (button contains emoji + text)
  await page.locator('button').filter({ hasText: 'Garden Owner' }).click();

  await page.getByPlaceholder('Your name').fill('E2E Signup User');
  await page.getByPlaceholder('you@example.com').fill(uniqueEmail);
  await page.getByPlaceholder('At least 6 characters').fill('TestPass123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/dashboard/);

  // Clean up: delete the test account
  const token = await page.evaluate(() => localStorage.getItem('gh_token'));
  if (token) {
    await fetch(`${API_URL}/api/auth/me`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: 'TestPass123' }),
    });
  }

  await context.close();
});

test('wrong password stays on login page', async ({ browser }) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();

  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill('e2e-fixture@test.local');
  await page.getByPlaceholder('••••••••').fill('WrongPassword999');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for the API call to complete: loading state clears, button is re-enabled
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();

  // Should still be on the login page — wrong password must not redirect
  await expect(page).toHaveURL(/\/login/);

  await context.close();
});
