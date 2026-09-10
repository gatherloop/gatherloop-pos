import { type Page, type APIRequestContext } from '@playwright/test';

const DEFAULT_USERNAME = process.env['E2E_USERNAME'] ?? 'admin';
const DEFAULT_PASSWORD = process.env['E2E_PASSWORD'] ?? 'password';

export const credentials = {
  username: DEFAULT_USERNAME,
  password: DEFAULT_PASSWORD,
};

export async function loginViaUI(
  page: Page,
  username = DEFAULT_USERNAME,
  password = DEFAULT_PASSWORD
): Promise<void> {
  await page.goto('/auth/login');
  await page.getByPlaceholder('Username').fill(username);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('/', { timeout: 15_000 });
}

export async function loginViaApi(
  request: APIRequestContext,
  username = DEFAULT_USERNAME,
  password = DEFAULT_PASSWORD
): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { username, password },
  });

  if (!response.ok()) {
    throw new Error(
      `Login failed: ${response.status()} ${await response.text()}`
    );
  }

  const cookies = response.headers()['set-cookie'] ?? '';
  return cookies;
}

export async function logoutViaApi(
  request: APIRequestContext
): Promise<void> {
  await request.get('/api/auth/logout');
}
