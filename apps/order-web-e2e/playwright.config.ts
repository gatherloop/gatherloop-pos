import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

const baseURL = process.env['BASE_URL'] || 'http://localhost:3000/';

const apiBaseURL = process.env['API_BASE_URL'] || 'http://127.0.0.1:8080';

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  workers: 1,
  globalTeardown: './src/global-teardown.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    navigationTimeout: 15_000,
    actionTimeout: 10_000,
  },
  timeout: 30_000,
  webServer: {
    command: 'npx nx run order-web:build && npx nx run order-web:start',
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    cwd: workspaceRoot,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_API_BASE_URL: apiBaseURL,
      NEXT_PUBLIC_API_PROXY_BASE_URL: '/api',
      API_INTERNAL_BASE_URL: apiBaseURL,
      NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED: 'true',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

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
