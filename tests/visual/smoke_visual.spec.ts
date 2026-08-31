import { test, expect } from '@playwright/test';

test.describe('Visual Surface Smoke & Viewport Assertions', () => {
  test('renders PWA deterministically at target viewport without horizontal overflow', async ({
    page,
  }, testInfo) => {
    const browserErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));
    await page.goto('http://127.0.0.1:4173');
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });

    await expect(page.locator('header')).toBeVisible();

    // Verify no unexpected horizontal window scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    expect(browserErrors).toEqual([]);
    await page.screenshot({
      path: `artifacts/overhaul/remediation-2026-08-31/browser/${testInfo.project.name}-pwa.png`,
      fullPage: true,
    });
  });

  test('renders Desktop Companion without layout overflow', async ({ page }, testInfo) => {
    const browserErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));
    await page.goto('http://127.0.0.1:4174');
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });

    await expect(page.getByText('PC Companion')).toBeVisible();
    await expect(page.getByText('Local Agent Ready')).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    expect(browserErrors).toEqual([]);
    await page.screenshot({
      path: `artifacts/overhaul/remediation-2026-08-31/browser/${testInfo.project.name}-desktop.png`,
      fullPage: true,
    });
  });
});
