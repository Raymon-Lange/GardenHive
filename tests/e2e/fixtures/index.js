import { test as base, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const API_URL = process.env.API_URL ?? BASE_URL;

export const test = base.extend({
  /**
   * isolatedPage — creates a unique user, opens a fresh authenticated browser context,
   * and tears down the user after the test completes.
   *
   * Usage:
   *   test('example', async ({ isolatedPage }) => {
   *     const { page, token, user } = isolatedPage;
   *   });
   */
  isolatedPage: async ({ browser }, use) => {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;
    const password = 'TestPass123';

    // Create a fresh user via the real API
    const regRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'E2E Isolated', email, password, role: 'owner' }),
    });
    if (!regRes.ok) {
      const body = await regRes.text();
      throw new Error(`isolatedPage fixture: registration failed — ${regRes.status} ${body}`);
    }
    const { token, user } = await regRes.json();

    // Open a fresh, unauthenticated browser context and inject auth into localStorage
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(BASE_URL);

    await page.evaluate(([t, u]) => {
      localStorage.setItem('gh_token', t);
      localStorage.setItem('gh_user', u);
    }, [token, JSON.stringify(user)]);

    await use({ page, token, user });

    // Teardown — delete the test user and all their data
    await fetch(`${API_URL}/api/auth/me`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password }),
    });

    await context.close();
  },
});

export { expect };
