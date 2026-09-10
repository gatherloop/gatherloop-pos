import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import * as path from 'path';

import { workspaceRoot } from '@nx/devkit';

const STORAGE_STATE = path.join(__dirname, 'src/.auth/storageState.json');

const baseURL = process.env['BASE_URL'] || 'http://127.0.0.1:3000';

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  workers: 1,
  globalSetup: './src/global-setup.ts',
  globalTeardown: './src/global-teardown.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    storageState: STORAGE_STATE,
    navigationTimeout: 15_000,
    actionTimeout: 10_000,
  },
  timeout: 30_000,
  webServer: {
    command: 'npx nx dev pos-web',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    cwd: workspaceRoot,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE,
      },
      testIgnore: [
        /auth\.spec\.ts/,
        /transactions\.mobile\.spec\.ts/,
        /rentals\.checkin\.mobile\.spec\.ts/,
        /stock-checks\.mobile\.spec\.ts/,
      ],
    },
    {
      name: 'chromium-no-auth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
      testMatch: /auth\.spec\.ts/,
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 5'],
        storageState: STORAGE_STATE,
      },
      testMatch: [
        /transactions\.mobile\.spec\.ts/,
        /rentals\.checkin\.mobile\.spec\.ts/,
        /stock-checks\.mobile\.spec\.ts/,
      ],
    },

    ...(process.env['FULL_BROWSER_MATRIX']
      ? [
          {
            name: 'firefox',
            use: {
              ...devices['Desktop Firefox'],
              storageState: STORAGE_STATE,
            },
            testIgnore: /auth\.spec\.ts/,
          },
          {
            name: 'webkit',
            use: {
              ...devices['Desktop Safari'],
              storageState: STORAGE_STATE,
            },
            testIgnore: /auth\.spec\.ts/,
          },
        ]
      : []),
  ],
});
