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

  const authDir = path.dirname(AUTH_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseURL}/auth/login`);

    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Submit' }).click();

    await page.waitForURL(`${baseURL}/`, { timeout: 15_000 });

    await context.storageState({ path: AUTH_STATE_PATH });

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
