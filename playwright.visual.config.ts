import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'pwa-390x844',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        baseURL: 'http://127.0.0.1:4173',
      },
    },
    {
      name: 'pwa-430x932',
      use: {
        viewport: { width: 430, height: 932 },
        isMobile: true,
        hasTouch: true,
        baseURL: 'http://127.0.0.1:4173',
      },
    },
    {
      name: 'pwa-768x1024',
      use: {
        viewport: { width: 768, height: 1024 },
        baseURL: 'http://127.0.0.1:4173',
      },
    },
    {
      name: 'desktop-1280x800',
      use: {
        viewport: { width: 1280, height: 800 },
        baseURL: 'http://127.0.0.1:4174',
      },
    },
    {
      name: 'desktop-1440x900',
      use: {
        viewport: { width: 1440, height: 900 },
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
