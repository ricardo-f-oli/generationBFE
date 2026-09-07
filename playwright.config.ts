import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end configuration.
 *
 * These run against a real browser, a real frontend build and a real backend — which is why
 * there are only a handful of them. E2E is the slowest and most brittle layer, so it is reserved
 * for journeys that cross the whole stack and would not be caught by a unit or behaviour test:
 * signing in, an approval gate refusing an action, and a file surviving a round trip.
 *
 * Anything provable further down the pyramid is tested further down the pyramid.
 */
export default defineConfig({
  testDir: './e2e',
  // A failing e2e should fail loudly rather than be retried into passing, except in CI where a
  // single retry absorbs genuine flakiness like a cold container.
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    // Artefacts only for failures — keeps the run fast and the output small.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /responsive\.spec\.ts/,
    },
    // Requirement #38. A real device profile rather than a resized desktop window: iPhone 13
    // brings a touch pointer and a 390px viewport, and pointer type changes which CSS applies.
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
      testMatch: /responsive\.spec\.ts/,
    },
  ],

  // Starts the dev server unless one is already up, so `npx playwright test` just works.
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
