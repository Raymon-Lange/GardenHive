/**
 * PDF Generation Tests — run on request only
 *
 * These tests are slow (html2canvas + jsPDF render time) and are excluded from
 * the default suite. Run them explicitly when needed:
 *
 *   RUN_PDF_TESTS=1 npx playwright test tests/e2e/pdf.spec.js
 *
 * Tests:
 *   - PDF download triggers a valid PDF file
 *   - PDF downloads across a range of garden sizes without error
 */

import { test, expect } from './fixtures/index.js';
import { readFileSync } from 'fs';

test.describe('PDF', () => {
  test.skip(!process.env.RUN_PDF_TESTS, 'PDF tests run on request only — set RUN_PDF_TESTS=1');

  const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
  const API_URL = process.env.API_URL ?? BASE_URL;

  async function getActiveGardenId(token) {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = await res.json();
    return user.activeGardenId;
  }

  async function setGardenDimensions(token, page, width = 10, height = 8) {
    const gardenId = await getActiveGardenId(token);
    await fetch(`${API_URL}/api/gardens/${gardenId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ gardenWidth: width, gardenHeight: height }),
    });
    const meRes = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const updatedUser = await meRes.json();
    await page.evaluate((u) => {
      localStorage.setItem('gh_user', JSON.stringify(u));
    }, updatedUser);
  }

  async function createBed(token, name = 'E2E PDF Bed', rows = 3, cols = 3) {
    const gardenId = await getActiveGardenId(token);
    const res = await fetch(`${API_URL}/api/beds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, rows, cols, gardenId }),
    });
    return res.json();
  }

  async function getFirstPublicPlant() {
    const res = await fetch(`${API_URL}/api/plants/public`);
    const plants = await res.json();
    return plants[0];
  }

  async function assignPlantToCell(token, bedId, plantId, row = 0, col = 0) {
    await fetch(`${API_URL}/api/beds/${bedId}/cells`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ row, col, plantId }),
    });
  }

  async function placeBedOnMap(token, bedId, mapRow = 0, mapCol = 0) {
    await fetch(`${API_URL}/api/beds/${bedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mapRow, mapCol }),
    });
  }

  test('download PDF button triggers a valid PDF file download', async ({ isolatedPage }) => {
    const { page, token } = isolatedPage;

    const bed = await createBed(token, 'E2E PDF Bed');
    const plant = await getFirstPublicPlant();
    await assignPlantToCell(token, bed._id, plant._id);
    await placeBedOnMap(token, bed._id);

    await setGardenDimensions(token, page);
    await page.goto('/map');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download PDF' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\w+-\d{4}-\d{2}-\d{2}\.pdf$/);

    const filePath = await download.path();
    const buffer = readFileSync(filePath);
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });

  test.describe('garden-size scenarios', () => {
    const scenarios = [
      { name: 'tiny-dense',       width: 4,  height: 6  },
      { name: 'small-standard',   width: 10, height: 12 },
      { name: 'medium-mixed',     width: 20, height: 30 },
      { name: 'large-sparse',     width: 50, height: 80 },
      { name: 'narrow-landscape', width: 8,  height: 40 },
      { name: 'many-beds',        width: 30, height: 50 },
    ];

    for (const scenario of scenarios) {
      test(`PDF downloads without error — ${scenario.name} (${scenario.width}×${scenario.height} ft)`, async ({ isolatedPage }) => {
        const { page, token } = isolatedPage;

        await setGardenDimensions(token, page, scenario.width, scenario.height);

        await page.goto('/map');
        await page.waitForSelector('[data-testid="garden-grid"], .garden-grid, [aria-label="Garden Map"]', { timeout: 10000 }).catch(() => {});

        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 30000 }),
          page.getByRole('button', { name: /download pdf/i }).click(),
        ]);

        expect(download.suggestedFilename()).toMatch(/\w+-\d{4}-\d{2}-\d{2}\.pdf$/);
      });
    }
  });
});
