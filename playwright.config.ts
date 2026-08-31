import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'pwa-mobile',
      testMatch: /pwa_.*\.spec\.ts/,
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        baseURL: 'http://127.0.0.1:4173',
      },
    },
    {
      name: 'desktop-web',
      testMatch: /desktop_.*\.spec\.ts/,
      use: {
        viewport: { width: 1280, height: 800 },
        baseURL: 'http://127.0.0.1:4174',
      },
    },
  ],
  webServer: [
    {
      command: 'npm run preview --workspace=@remote/pwa -- --port 4173 --host 127.0.0.1',
      port: 4173,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run preview --workspace=@remote/desktop -- --port 4174 --host 127.0.0.1',
      port: 4174,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
