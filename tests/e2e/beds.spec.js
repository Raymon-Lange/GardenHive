/**
 * US2 — Garden Bed Management
 *
 * Tests: garden setup, create bed, assign plant, remove plant, beds list
 *
 * All tests use the isolatedPage fixture (per-test isolated user + teardown).
 * Tests 2–5 pre-configure garden dimensions in beforeEach.
 *
 * Selector notes:
 *   - GardenDimensionsModal inputs use placeholder "e.g. 20" / "e.g. 12"
 *   - Add-bed form inputs: bed name has placeholder; width/height are plain number inputs
 *   - Bed cells are <button class="w-14 h-14 rounded-lg border-2 ...">
 *
 * PDF tests live in pdf.spec.js — run with RUN_PDF_TESTS=1.
 */

import { test, expect } from './fixtures/index.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const API_URL = process.env.API_URL ?? BASE_URL;

/**
 * Set garden dimensions via API and update the localStorage gh_user so the
 * React app initialises with the correct dimensions on next page navigation.
 */
async function setGardenDimensions(token, page, width = 10, height = 8) {
  const gardenId = await getActiveGardenId(token);
  await fetch(`${API_URL}/api/gardens/${gardenId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ gardenWidth: width, gardenHeight: height }),
  });
  // Sync the updated user into localStorage (fetch fresh from /api/auth/me)
  const meRes = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const updatedUser = await meRes.json();
  await page.evaluate((u) => {
    localStorage.setItem('gh_user', JSON.stringify(u));
  }, updatedUser);
}

async function getActiveGardenId(token) {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const user = await res.json();
  return user.activeGardenId;
}

async function createBed(token, name = 'E2E Test Bed', rows = 3, cols = 3) {
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

  test('selecting a plant then clicking empty cell stamps the plant emoji', async ({ isolatedPage }) => {
    const { page, token } = isolatedPage;

    const bed = await createBed(token);
    const plant = await getFirstPublicPlant();

    await page.goto(`/beds/${bed._id}`);

    // Select a plant from the right-hand plant panel — this activates stamp mode
    await page.locator('aside').getByText(plant.name).click();

    // Stamp mode banner should confirm the selection
    await expect(page.getByText(`Stamping:`)).toBeVisible();

    // Click the first empty cell (contains a '+' span)
    const cell = page.locator('button').filter({ hasText: '+' }).first();
    await cell.click();

    // The cell should now show the plant's emoji
    await expect(page.getByText(plant.emoji).first()).toBeVisible();
  });

  test('selecting the same plant and clicking a planted cell removes it', async ({ isolatedPage }) => {
    const { page, token } = isolatedPage;

    const bed = await createBed(token);
    const plant = await getFirstPublicPlant();
    await assignPlantToCell(token, bed._id, plant._id);

    await page.goto(`/beds/${bed._id}`);

    // Plant emoji should be visible in the assigned cell
    await expect(page.getByText(plant.emoji).first()).toBeVisible();

    // Select the same plant from the panel to activate stamp mode
    await page.locator('aside').getByText(plant.name).click();
    await expect(page.getByText('Stamping:')).toBeVisible();

    // Click the planted cell — same plant selected, so it toggles off (removes the plant)
    const assignedCell = page.locator(`button[title*="${plant.name}"]`).first();
    await assignedCell.click();

    // Emoji should no longer be present in any cell button (the banner still shows it — scope to w-14 cells)
    await expect(page.locator('button.w-14').filter({ hasText: plant.emoji })).not.toBeVisible();
  });

  test('beds list page shows all created beds', async ({ isolatedPage }) => {
    const { page, token } = isolatedPage;

    await createBed(token, 'E2E Bed Alpha');
    await createBed(token, 'E2E Bed Beta');

    await page.goto('/beds');

    await expect(page.getByText('E2E Bed Alpha')).toBeVisible();
    await expect(page.getByText('E2E Bed Beta')).toBeVisible();
  });

});
