import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.js',
  globalTeardown: './tests/e2e/global-teardown.js',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    storageState: './tests/e2e/.auth/user.json',
    trace: 'retain-on-failure',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  // No webServer — Docker stack is managed externally via ./scripts/start.sh
});
