import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// P4 in docs/trd-order-app-nextjs-migration.md: runs the exact same specs as
// apps/order-e2e (testDir points there — nothing is duplicated, so the two
// suites cannot drift) against the Next.js app instead of the Vite SPA.
// Unlike the SPA (no server, D18), this is a real `next start` server, so
// `page.goto()` calls resolve from the origin root — no base path segment.
const baseURL = process.env['BASE_URL'] || 'http://localhost:3000/';

// The Go API the built app calls through its own same-origin `/api` proxy
// (D13) — this only configures the rewrite destination the Next server
// forwards to, not what the browser calls directly.
const apiBaseURL = process.env['API_BASE_URL'] || 'http://127.0.0.1:8080';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: '../order-e2e/src' }),
  /* Run test files serially — every spec shares the seeded catalog/table
   * data for the one browser-side session cookie a test creates, so
   * parallel files would race on the same cart. */
  workers: 1,
  /* dist-404.spec.ts is Vite/GitHub-Pages-only (D19) — Next answers every
   * route with a real file-system page, so there is no 404.html to check. */
  testIgnore: /dist-404\.spec\.ts/,
  /* Closes the authenticated API context opened lazily by utils/api.ts. */
  globalTeardown: '../order-e2e/src/global-teardown.ts',
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Navigation timeout */
    navigationTimeout: 15_000,
    /* Action timeout */
    actionTimeout: 10_000,
  },
  /* Timeouts */
  timeout: 30_000,
  /* Build and start the real Next.js server (D2/D13) — no dev server, no
   * static export, matching how the app actually runs in production. */
  webServer: {
    command: 'npx nx run order-next:build && npx nx run order-next:start',
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    cwd: workspaceRoot,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_API_BASE_URL: apiBaseURL,
      NEXT_PUBLIC_API_PROXY_BASE_URL: '/api',
      // FR-8/D10: the happy path exercises the real QRIS stub copy, not the
      // kill-switch's "not available" message.
      NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED: 'true',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    /* Cross-browser projects — enabled for CI nightly runs via FULL_BROWSER_MATRIX=true */
    ...(process.env['FULL_BROWSER_MATRIX']
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
          },
        ]
      : []),
  ],
});
