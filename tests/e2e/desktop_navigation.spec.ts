import { test, expect } from '@playwright/test';

test.describe('Desktop Web Navigation Flow', () => {
  test('loads Desktop and navigates between sidebar views', async ({ page }) => {
    if (page.url().includes('4173')) test.skip();
    await page.goto('http://127.0.0.1:4174');

    await expect(page.getByText('PC Companion')).toBeVisible();
    await expect(page.getByText('Local Agent Ready')).toBeVisible();

    // Navigate to Trusted Devices
    await page.getByRole('button', { name: /trusted devices/i }).click();
    await expect(page.getByText(/trusted devices/i).first()).toBeVisible();

    // Navigate to Settings
    await page.getByRole('button', { name: /agent settings/i }).click();
    await expect(page.getByText(/settings/i).first()).toBeVisible();
  });
});
