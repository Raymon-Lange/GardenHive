import { readFileSync } from 'fs';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const API_URL = process.env.API_URL ?? BASE_URL;
const FIXTURE_PASSWORD = 'TestPass123';

export default async function globalTeardown() {
  let token;

  try {
    const state = JSON.parse(readFileSync('tests/e2e/.auth/user.json', 'utf-8'));
    token = state.origins?.[0]?.localStorage?.find((e) => e.name === 'gh_token')?.value;
  } catch {
    return; // Nothing to clean up if the file doesn't exist
  }

  if (!token) return;

  await fetch(`${API_URL}/api/auth/me`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password: FIXTURE_PASSWORD }),
  });
}
