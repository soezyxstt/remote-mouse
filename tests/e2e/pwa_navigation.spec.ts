import { test, expect } from '@playwright/test';

test.describe('PWA Navigation & Feature Flow', () => {
  test.beforeEach(async ({ page }) => {
    if (page.url().includes('4174')) return;
  });

  test('loads PWA and shows initial trackpad with header and nav', async ({ page }) => {
    if (page.url().includes('4174')) test.skip();
    await page.goto('http://127.0.0.1:4173');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByRole('tab', { name: /control/i })).toBeVisible();
    await expect(page.getByLabel('Trackpad touch surface')).toBeVisible();
  });

  test('switches tabs across scrollable navigation rail', async ({ page }) => {
    if (page.url().includes('4174')) test.skip();
    await page.goto('http://127.0.0.1:4173');

    // 1. Switch to Keyboard
    await page.getByRole('tab', { name: /keyboard/i }).click();
    await expect(page.locator('button', { hasText: 'Space' })).toBeVisible();

    // 2. Switch to Media
    await page.getByRole('tab', { name: /media/i }).click();
    await expect(page.getByText(/media/i).first()).toBeVisible();

    // 3. Switch to Slides
    await page.getByRole('tab', { name: /slides/i }).click();
    await expect(page.getByRole('tab', { name: /slides/i })).toBeVisible();

    // 4. Switch to Apps
    await page.getByRole('tab', { name: /apps/i }).click();
    await expect(page.getByPlaceholder(/filter apps and windows/i)).toBeVisible();

    // 5. Switch back to Control
    await page.getByRole('tab', { name: /control/i }).click();
    await expect(page.getByLabel('Trackpad touch surface')).toBeVisible();
  });
});
