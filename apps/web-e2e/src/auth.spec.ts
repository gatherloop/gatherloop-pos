/**
 * Phase 2: Authentication Flow
 *
 * Tests the login/logout cycle and route protection end-to-end.
 *
 * These tests run under the `chromium-no-auth` project (see playwright.config.ts)
 * which does NOT load saved storageState, so every test starts unauthenticated.
 * Tests that need an authenticated session log in via the UI within the test itself.
 *
 * Why these tests matter:
 * - Auth check happens in `getServerSideProps` — real SSR behavior, not testable in handler tests
 * - Cookie persistence across page navigations is a real browser concern
 * - The redirect chain involves real HTTP redirects through Next.js SSR
 */

import { test, expect } from '@playwright/test';
import * as sel from './utils/selectors';

const VALID_USERNAME = process.env['E2E_USERNAME'] ?? 'admin';
const VALID_PASSWORD = process.env['E2E_PASSWORD'] ?? 'password';

/** Helper: log in via UI and wait for dashboard */
async function loginViaUI(
  page: Parameters<typeof sel.auth.usernameInput>[0],
  username = VALID_USERNAME,
  password = VALID_PASSWORD
) {
  await page.goto('/auth/login');
  await sel.auth.usernameInput(page).fill(username);
  await sel.auth.passwordInput(page).fill(password);
  await sel.auth.submitButton(page).click();
  // Dashboard URL may include query params (e.g. /?groupBy=date)
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

    // Should redirect to the dashboard (URL may include query params like ?groupBy=date)
    await page.waitForURL((url) => new URL(url).pathname === '/', {
      timeout: 15_000,
    });

    // Toast confirms success (use first() to avoid strict mode with accessibility duplicate)
    await expect(page.getByText('Login Success').first()).toBeVisible();
  });

  test('should show error message with invalid credentials', async ({
    page,
  }) => {
    await page.goto('/auth/login');
    await sel.auth.usernameInput(page).fill(VALID_USERNAME);
    await sel.auth.passwordInput(page).fill('wrong-password-xyz');
    await sel.auth.submitButton(page).click();

    // Toast shows "Login Error" (use first() to avoid strict mode with accessibility duplicate)
    await expect(page.getByText('Login Error').first()).toBeVisible();

    // Should remain on the login page (no redirect on failure)
    await expect(page).toHaveURL('/auth/login');
  });

  test('should redirect authenticated user from "/auth/login" to "/"', async ({
    page,
  }) => {
    // Establish an authenticated session
    await loginViaUI(page);

    // Navigating back to login should redirect to dashboard (SSR redirect)
    await page.goto('/auth/login');
    // Dashboard URL may include query params like ?groupBy=date
    await page.waitForURL((url) => new URL(url).pathname === '/', {
      timeout: 15_000,
    });
  });

  test('should log out and redirect to login page', async ({ page }) => {
    await loginViaUI(page);

    // Click the logout button in the sidebar
    await sel.sidebar.logoutButton(page).click();

    // Should redirect to the login page
    await expect(page).toHaveURL('/auth/login', { timeout: 15_000 });

    // Toast confirms logout (use first() to avoid strict mode with accessibility duplicate)
    await expect(page.getByText('Logout Success').first()).toBeVisible();
  });

  test('should not access protected routes after logout', async ({ page }) => {
    await loginViaUI(page);

    // Log out
    await sel.sidebar.logoutButton(page).click();
    await expect(page).toHaveURL('/auth/login', { timeout: 15_000 });

    // Attempt to navigate to a protected route — should redirect back to login
    await page.goto('/');
    await expect(page).toHaveURL('/auth/login');
  });
});
