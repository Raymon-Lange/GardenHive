/**
 * US2 — Garden Bed Management
 *
 * Tests: garden setup, create bed, assign plant, remove plant, beds list, PDF download
 *
 * All tests use the isolatedPage fixture (per-test isolated user + teardown).
 * Tests 2–6 pre-configure garden dimensions in beforeEach.
 *
 * Selector notes:
 *   - GardenDimensionsModal inputs use placeholder "e.g. 20" / "e.g. 12"
 *   - Add-bed form inputs: bed name has placeholder; width/height are plain number inputs
 *   - Bed cells are <button class="w-14 h-14 rounded-lg border-2 ...">
 */

import { test, expect } from './fixtures/index.js';
import { readFileSync } from 'fs';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const API_URL = process.env.API_URL ?? BASE_URL;

/**
 * Set garden dimensions via API and update the localStorage gh_user so the
 * React app initialises with the correct dimensions on next page navigation.
 */
async function setGardenDimensions(token, page, width = 10, height = 8) {
  const res = await fetch(`${API_URL}/api/auth/me/garden`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ gardenWidth: width, gardenHeight: height }),
  });
  const updatedUser = await res.json();
  // Sync the updated user into localStorage so the app doesn't initialise
  // with the stale (pre-dimensions) gh_user from the fixture setup
  await page.evaluate((u) => {
    localStorage.setItem('gh_user', JSON.stringify(u));
  }, updatedUser);
}

async function createBed(token, name = 'E2E Test Bed', rows = 3, cols = 3) {
  const res = await fetch(`${API_URL}/api/beds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, rows, cols }),
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

// ── Test 1: garden setup modal (no beforeEach — new user has no dimensions set) ─

test('garden setup modal appears and submitting shows the grid', async ({ isolatedPage }) => {
  const { page } = isolatedPage;

  await page.goto('/map');

  // Dimensions modal should be visible for a new user
  await expect(page.getByText('Set your garden size')).toBeVisible();

  // Modal uses placeholder-based inputs (labels have no htmlFor)
  await page.getByPlaceholder('e.g. 20').fill('10');
  await page.getByPlaceholder('e.g. 12').fill('8');
  await page.getByRole('button', { name: 'Set garden size' }).click();

  // Modal dismissed — "Add bed" button confirms the map is loaded
  await expect(page.getByText('Set your garden size')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Add bed' })).toBeVisible();
});

// ── Tests 2–6: garden dimensions are pre-configured via API ─────────────────────

test.describe('with garden configured', () => {
  test.beforeEach(async ({ isolatedPage }) => {
    await setGardenDimensions(isolatedPage.token, isolatedPage.page);
  });

  test('create bed via map form shows bed name on page', async ({ isolatedPage }) => {
    const { page } = isolatedPage;

    await page.goto('/map');

    await page.getByRole('button', { name: 'Add bed' }).click();

    // Bed name input has a placeholder; width/height are plain number inputs in the form
    await page.getByPlaceholder('e.g. Raised Bed 1').fill('E2E Bed');
    // First number input = width (cols), second = height (rows)
    await page.locator('input[type="number"]').nth(0).fill('3');
    await page.locator('input[type="number"]').nth(1).fill('2');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText('E2E Bed')).toBeVisible();
  });

  test('clicking empty cell opens plant picker and assigned plant emoji appears', async ({ isolatedPage }) => {
    const { page, token } = isolatedPage;

    const bed = await createBed(token);
    const plant = await getFirstPublicPlant();

    await page.goto(`/beds/${bed._id}`);

    // Cells are <button class="w-14 h-14 ..."> — click the first (empty) cell
    const cell = page.locator('button').filter({ hasText: '+' }).first();
    await cell.click();

    // Plant picker dialog should open
    await expect(page.getByText('Choose a plant')).toBeVisible();

    // Click the first plant option in the list
    await page.locator('button').filter({ hasText: plant.name }).first().click();

    // The cell should now show the plant's emoji
    await expect(page.getByText(plant.emoji).first()).toBeVisible();
  });

  test('clicking assigned cell and choosing clear removes the plant', async ({ isolatedPage }) => {
    const { page, token } = isolatedPage;

    const bed = await createBed(token);
    const plant = await getFirstPublicPlant();
    await assignPlantToCell(token, bed._id, plant._id);

    await page.goto(`/beds/${bed._id}`);

    // Plant emoji should be visible in the assigned cell
    await expect(page.getByText(plant.emoji).first()).toBeVisible();

    // Click the assigned cell (it has the plant name in its title)
    const assignedCell = page.locator(`button[title*="${plant.name}"]`).first();
    await assignedCell.click();

    // "Clear cell" option appears in the picker
    await expect(page.getByRole('button', { name: 'Clear cell' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear cell' }).click();

    // Emoji should no longer be present in any cell
    await expect(page.getByText(plant.emoji).first()).not.toBeVisible();
  });

  test('beds list page shows all created beds', async ({ isolatedPage }) => {
    const { page, token } = isolatedPage;

    await createBed(token, 'E2E Bed Alpha');
    await createBed(token, 'E2E Bed Beta');

    await page.goto('/beds');

    await expect(page.getByText('E2E Bed Alpha')).toBeVisible();
    await expect(page.getByText('E2E Bed Beta')).toBeVisible();
  });

  test('download PDF button triggers a valid PDF file download', async ({ isolatedPage }) => {
    const { page, token } = isolatedPage;

    const bed = await createBed(token, 'E2E PDF Bed');
    const plant = await getFirstPublicPlant();
    await assignPlantToCell(token, bed._id, plant._id);
    // Place the bed on the map so it appears in the PDF
    await placeBedOnMap(token, bed._id);

    await page.goto('/map');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download PDF' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

    const filePath = await download.path();
    const buffer = readFileSync(filePath);
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });
});
