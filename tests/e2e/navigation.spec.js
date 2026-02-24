/**
 * US5 — Navigation and Layout
 *
 * Tests: sidebar nav links, collapse sidebar, mobile overlay
 *
 * All tests use the default storageState (fixture user, logged in as owner).
 *
 * Selector notes:
 *   - Sidebar is an <aside> element
 *   - Collapse button: title="Collapse" when expanded
 *   - Nav link spans get md:hidden (display:none) when collapsed at ≥ 768px
 *   - Mobile hamburger: <button> in <header> with a Menu icon (no text)
 *   - Mobile sidebar hidden via -translate-x-full: use toBeInViewport() to distinguish
 */

import { test, expect } from '@playwright/test';

test('sidebar contains all expected navigation links', async ({ page }) => {
  await page.goto('/dashboard');

  const sidebar = page.locator('aside');

  await expect(sidebar.getByRole('link', { name: /dashboard/i })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: /garden map/i })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: /harvests/i })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: /analytics/i })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: /profile/i })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: /admin/i })).toBeVisible();
});

test('collapse sidebar hides nav labels', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/dashboard');

  // Sidebar should be expanded — "Dashboard" label span is visible
  const dashboardSpan = page.locator('aside a[href="/dashboard"] span');
  await expect(dashboardSpan).toBeVisible();

  // Click the collapse button (has title="Collapse" when expanded)
  await page.getByTitle('Collapse').click();

  // After collapsing, the span gets md:hidden (display:none at ≥768px)
  await expect(dashboardSpan).not.toBeVisible();
});

test('mobile viewport — hamburger button opens sidebar into view', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/dashboard');

  const dashboardLink = page.locator('aside a[href="/dashboard"]');

  // On mobile the aside is translated off-screen (-translate-x-full)
  // The link is not in the visible viewport area
  await expect(dashboardLink).not.toBeInViewport();

  // Click the hamburger button (the only <button> in the mobile <header>)
  await page.locator('header button').first().click();

  // Sidebar slides in — Dashboard link is now within the viewport
  await expect(dashboardLink).toBeInViewport();
});
