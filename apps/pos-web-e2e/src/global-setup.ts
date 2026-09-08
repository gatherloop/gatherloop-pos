/**
 * Playwright Global Setup
 *
 * Runs once before the entire test suite. Logs in via the UI, then saves the
 * browser storage state (cookies + localStorage) to a JSON file so that every
 * subsequent test can start pre-authenticated — no repeated login roundtrips.
 *
 * Auth spec tests (auth.spec.ts) are excluded from using storageState so they
 * can test the login/logout flow themselves.
 *
 * See playwright.config.ts → `globalSetup` and `use.storageState`.
 */

import { chromium, type FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const AUTH_STATE_PATH = path.join(
  __dirname,
  '.auth',
  'storageState.json'
);

export default async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use?.baseURL ?? 'http://127.0.0.1:3000';

  const username = process.env['E2E_USERNAME'] ?? 'mnindrazaka';
  const password = process.env['E2E_PASSWORD'] ?? '((mnindrazaka))';

  // Ensure the .auth directory exists
  const authDir = path.dirname(AUTH_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    await page.goto(`${baseURL}/auth/login`);

    // Fill in credentials
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Submit' }).click();

    // Wait for redirect to dashboard — confirms login was successful
    await page.waitForURL(`${baseURL}/`, { timeout: 15_000 });

    // Persist auth cookies so all other tests skip login
    await context.storageState({ path: AUTH_STATE_PATH });

    // Strip the Secure flag from saved cookies so that Playwright's APIRequestContext
    // (used in beforeAll/afterAll for test-data setup) can send them over HTTP in dev.
    const state = JSON.parse(fs.readFileSync(AUTH_STATE_PATH, 'utf-8'));
    for (const cookie of state.cookies ?? []) {
      cookie.secure = false;
    }
    fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify(state, null, 2));

    console.log(`[global-setup] Auth state saved to ${AUTH_STATE_PATH}`);
  } catch (error) {
    console.error('[global-setup] Login failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}
