import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';

import { workspaceRoot } from '@nx/devkit';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://127.0.0.1:3000';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  /* Global setup/teardown for auth state preparation */
  globalSetup: './src/global-setup.ts',
  globalTeardown: './src/global-teardown.ts',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Reuse authenticated state from global setup (overridden per-project in auth.spec.ts) */
    storageState: 'apps/web-e2e/src/.auth/storageState.json',
    /* Navigation timeout */
    navigationTimeout: 15_000,
    /* Action timeout */
    actionTimeout: 10_000,
  },
  /* Timeouts */
  timeout: 30_000,
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npx nx dev web',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    cwd: workspaceRoot,
    timeout: 120_000,
  },
  projects: [
    /* Setup project — runs global-setup logic as a named project for auth.spec.ts */
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    /* Default: Chromium only for local dev and CI per-PR */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        /* Use saved auth state for all tests except auth.spec.ts */
        storageState: 'apps/web-e2e/src/.auth/storageState.json',
      },
      testIgnore: /auth\.spec\.ts/,
    },
    /* Auth tests run without saved state (they test login/logout themselves) */
    {
      name: 'chromium-no-auth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined,
      },
      testMatch: /auth\.spec\.ts/,
    },

    /* Cross-browser projects — enabled for CI nightly runs via FULL_BROWSER_MATRIX=true */
    ...(process.env['FULL_BROWSER_MATRIX']
      ? [
          {
            name: 'firefox',
            use: {
              ...devices['Desktop Firefox'],
              storageState:
                'apps/web-e2e/src/.auth/storageState.json' as string,
            },
            testIgnore: /auth\.spec\.ts/,
          },
          {
            name: 'webkit',
            use: {
              ...devices['Desktop Safari'],
              storageState:
                'apps/web-e2e/src/.auth/storageState.json' as string,
            },
            testIgnore: /auth\.spec\.ts/,
          },
        ]
      : []),
  ],
});
