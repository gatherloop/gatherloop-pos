import { test, expect } from '@playwright/test';
import * as sel from './utils/selectors';

const VALID_USERNAME = process.env['E2E_USERNAME'] ?? 'mnindrazaka';
const VALID_PASSWORD = process.env['E2E_PASSWORD'] ?? '((mnindrazaka))';

async function loginViaUI(
  page: Parameters<typeof sel.auth.usernameInput>[0],
  username = VALID_USERNAME,
  password = VALID_PASSWORD
) {
  await page.goto('/auth/login');
  await sel.auth.usernameInput(page).fill(username);
  await sel.auth.passwordInput(page).fill(password);
  await sel.auth.submitButton(page).click();
  await page.waitForURL((url) => new URL(url).pathname === '/', {
    timeout: 15_000,
  });
}

test.describe('Authentication', () => {
  test('should redirect unauthenticated user from "/" to "/auth/login"', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/auth/login');
  });

  test('should log in with valid credentials and redirect to dashboard', async ({
    page,
  }) => {
    await page.goto('/auth/login');
    await sel.auth.usernameInput(page).fill(VALID_USERNAME);
    await sel.auth.passwordInput(page).fill(VALID_PASSWORD);
    await sel.auth.submitButton(page).click();

    await page.waitForURL((url) => new URL(url).pathname === '/', {
      timeout: 15_000,
    });

    await expect(page.getByText('Login Success').first()).toBeVisible();
  });

  test('should show error message with invalid credentials', async ({
    page,
  }) => {
    await page.goto('/auth/login');
    await sel.auth.usernameInput(page).fill(VALID_USERNAME);
    await sel.auth.passwordInput(page).fill('wrong-password-xyz');
    await sel.auth.submitButton(page).click();

    await expect(page.getByText('Login Error').first()).toBeVisible();

    await expect(page).toHaveURL('/auth/login');
  });

  test('should redirect authenticated user from "/auth/login" to "/"', async ({
    page,
  }) => {
    await loginViaUI(page);

    await page.goto('/auth/login');
    await page.waitForURL((url) => new URL(url).pathname === '/', {
      timeout: 15_000,
    });
  });

  test('should log out and redirect to login page', async ({ page }) => {
    await loginViaUI(page);

    await sel.sidebar.logoutButton(page).click();

    await expect(page).toHaveURL('/auth/login', { timeout: 15_000 });

    await expect(page.getByText('Logout Success').first()).toBeVisible();
  });

  test('should not access protected routes after logout', async ({ page }) => {
    await loginViaUI(page);

    await sel.sidebar.logoutButton(page).click();
    await expect(page).toHaveURL('/auth/login', { timeout: 15_000 });

    await page.goto('/');
    await expect(page).toHaveURL('/auth/login');
  });
});
