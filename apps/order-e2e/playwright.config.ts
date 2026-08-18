import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// Phase 12 in docs/prd-table-ordering.md: mirrors apps/web-e2e, but the
// customer SPA has no server of its own (D18) — it is a static bundle, so
// the suite runs against a real `vite preview` of the production build
// rather than a dev server. Must end with a trailing slash: `page.goto()`
// calls below always pass a *relative* path (no leading `/`), and the
// leading-slash form would resolve against the origin instead of the
// '/gatherloop-pos/order/' base path baked into the production build
// (see apps/order/vite.config.ts).
const baseURL =
  process.env['BASE_URL'] || 'http://localhost:4300/gatherloop-pos/order/';

// The Go API the built SPA calls directly, cross-origin, with no proxy
// (D18/D22) — baked into the bundle at build time via VITE_API_BASE_URL.
const apiBaseURL = process.env['API_BASE_URL'] || 'http://127.0.0.1:8080';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  /* Run test files serially — every spec shares the seeded catalog/table
   * data for the one browser-side session cookie a test creates, so
   * parallel files would race on the same cart. */
  workers: 1,
  /* Closes the authenticated API context opened lazily by utils/api.ts. */
  globalTeardown: './src/global-teardown.ts',
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
  /* Build the static SPA, byte-copy `index.html` to `404.html` exactly as
   * FR-9/D19 describes for the real GitHub Pages deploy (phase 12b wires
   * this into CI; here it makes the same artifact so the deep-link spec can
   * exercise it), then serve the build with `vite preview` — no dev server,
   * no SSR, matching how the app actually runs in production (D18). */
  webServer: {
    command:
      'npx nx run order:build && cp dist/order/index.html dist/order/404.html && npx nx run order:preview',
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    cwd: workspaceRoot,
    timeout: 180_000,
    env: {
      VITE_API_BASE_URL: apiBaseURL,
      // FR-8/D10: the happy path exercises the real QRIS stub copy, not the
      // kill-switch's "not available" message.
      VITE_ORDER_CHECKOUT_ENABLED: 'true',
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
