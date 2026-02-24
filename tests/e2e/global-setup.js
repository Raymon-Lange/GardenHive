import { chromium } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
// API is proxied through nginx on the same host as the frontend
const API_URL = process.env.API_URL ?? BASE_URL;

const FIXTURE_EMAIL = 'e2e-fixture@test.local';
const FIXTURE_PASSWORD = 'TestPass123';

export default async function globalSetup() {
  let token, user;

  // Try to log in first; register if the fixture user doesn't exist yet
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: FIXTURE_EMAIL, password: FIXTURE_PASSWORD }),
  });

  if (loginRes.ok) {
    ({ token, user } = await loginRes.json());
  } else {
    const regRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E Fixture',
        email: FIXTURE_EMAIL,
        password: FIXTURE_PASSWORD,
        role: 'owner',
      }),
    });
    if (!regRes.ok) {
      const body = await regRes.text();
      throw new Error(`global-setup: failed to create fixture user — ${regRes.status} ${body}`);
    }
    ({ token, user } = await regRes.json());
  }

  // Open a real browser page so Playwright can capture the localStorage state
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(BASE_URL);

  await page.evaluate(([t, u]) => {
    localStorage.setItem('gh_token', t);
    localStorage.setItem('gh_user', u);
  }, [token, JSON.stringify(user)]);

  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' });
  await browser.close();
}
