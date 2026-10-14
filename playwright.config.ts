import { defineConfig, devices } from '@playwright/test';

// End-to-end smoke tests. Run after a build: `npm run build && npm run e2e`.
// Locally only Chromium is required; CI also runs Firefox and WebKit.
const all = !!process.env.CI || !!process.env.ALL_BROWSERS;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://127.0.0.1:4321' },
  webServer: {
    command: 'npx astro preview --port 4321 --host 127.0.0.1',
    url: 'http://127.0.0.1:4321/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1536, height: 1024 } } },
    ...(all
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1536, height: 1024 } } },
          { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1536, height: 1024 } } },
          { name: 'mobile', use: { ...devices['Pixel 7'] } },
        ]
      : []),
  ],
});
