/**
 * Phase 4: Wallet & Transfer Flow
 *
 * Tests wallet creation and money transfers with real balance tracking.
 * Tests run serially — each builds on the previous test's state.
 *
 * Flows tested:
 * - Creating wallets via UI (create form)
 * - Verifying wallets and their initial balances in the list
 * - Transferring money between wallets via UI
 * - Verifying updated balances after transfer
 * - Verifying the transfer appears in transfer history
 *
 * Why this matters:
 * - Wallets handle real money — financial accuracy is critical for a POS system
 * - Transfer is a cross-entity operation (two wallets affected simultaneously)
 * - Balance consistency can only be verified with a real database
 * - Authentication is handled via storageState from global-setup.ts
 */

import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

// Unique names keyed by timestamp to avoid collisions with existing data
const TS = Date.now();
const SOURCE_WALLET_NAME = `E2E Source ${TS}`;
const DEST_WALLET_NAME = `E2E Dest ${TS}`;

// Financial values
const SOURCE_BALANCE = 50000;
const DEST_BALANCE = 10000;
const TRANSFER_AMOUNT = 20000;

// Expected balances after the transfer
const SOURCE_BALANCE_AFTER = SOURCE_BALANCE - TRANSFER_AMOUNT; // 30000
const DEST_BALANCE_AFTER = DEST_BALANCE + TRANSFER_AMOUNT; // 30000

// Indonesian locale number format: 50000 → "50.000"
function formatBalance(amount: number): string {
  return `Rp. ${amount.toLocaleString('id')}`;
}

test.describe.serial('Wallet Management', () => {
  // Wallet IDs captured during the transfer test — used for cleanup
  let sourceWalletId: number | undefined;
  let destWalletId: number | undefined;

  test.afterAll(async ({ request }) => {
    if (sourceWalletId !== undefined) {
      await api.deleteWallet(request, sourceWalletId).catch(() => {
        // Ignore — wallet may already be gone
      });
    }
    if (destWalletId !== undefined) {
      await api.deleteWallet(request, destWalletId).catch(() => {
        // Ignore — wallet may already be gone
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Test 1: Create two wallets via UI
  // ---------------------------------------------------------------------------

  test('should create two wallets (source and destination)', async ({
    page,
  }) => {
    // ── Create source wallet ──────────────────────────────────────────────────
    await page.goto('/wallets/create');

    await expect(sel.walletForm.submitButton(page)).toBeVisible({
      timeout: 15_000,
    });

    await sel.walletForm.nameInput(page).fill(SOURCE_WALLET_NAME);
    await sel.walletForm.balanceInput(page).fill(String(SOURCE_BALANCE));
    await sel.walletForm.paymentCostInput(page).fill('0');

    await sel.walletForm.submitButton(page).click();
    await page.waitForURL('/wallets', { timeout: 15_000 });

    // ── Create destination wallet ─────────────────────────────────────────────
    await page.goto('/wallets/create');

    await expect(sel.walletForm.submitButton(page)).toBeVisible({
      timeout: 15_000,
    });

    await sel.walletForm.nameInput(page).fill(DEST_WALLET_NAME);
    await sel.walletForm.balanceInput(page).fill(String(DEST_BALANCE));
    await sel.walletForm.paymentCostInput(page).fill('0');

    await sel.walletForm.submitButton(page).click();
    await page.waitForURL('/wallets', { timeout: 15_000 });

    await expect(page).toHaveURL('/wallets');
  });

  // ---------------------------------------------------------------------------
  // Test 2: Verify both wallets in the list with correct initial balances
  // ---------------------------------------------------------------------------

  test('should display both wallets in the wallet list with correct initial balances', async ({
    page,
  }) => {
    await page.goto('/wallets');

    // Both wallet names should appear
    await expect(
      sel.walletList.walletItem(page, SOURCE_WALLET_NAME)
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      sel.walletList.walletItem(page, DEST_WALLET_NAME)
    ).toBeVisible({ timeout: 15_000 });

    // Balances should match the values entered at creation (Indonesian locale format)
    await expect(
      sel.walletList.walletBalance(page, SOURCE_WALLET_NAME)
    ).toContainText(formatBalance(SOURCE_BALANCE));
    await expect(
      sel.walletList.walletBalance(page, DEST_WALLET_NAME)
    ).toContainText(formatBalance(DEST_BALANCE));
  });

  // ---------------------------------------------------------------------------
  // Test 3: Transfer money from source to destination wallet
  // ---------------------------------------------------------------------------

  test('should transfer amount from source to destination wallet', async ({
    page,
  }) => {
    await page.goto('/wallets');

    // ── Capture destination wallet ID ─────────────────────────────────────────
    // Navigate to the destination wallet's transfer history page to grab its ID
    await sel.walletList.menuButton(page, DEST_WALLET_NAME).click();
    await sel.walletList.menuOption(page, 'Transfer').click();
    await page.waitForURL(/\/wallets\/\d+\/transfers$/, { timeout: 15_000 });
    const destMatch = page.url().match(/\/wallets\/(\d+)\/transfers$/);
    if (destMatch) destWalletId = parseInt(destMatch[1]);

    // ── Capture source wallet ID and navigate to its transfer history ──────────
    await page.goto('/wallets');
    await sel.walletList.menuButton(page, SOURCE_WALLET_NAME).click();
    await sel.walletList.menuOption(page, 'Transfer').click();
    await page.waitForURL(/\/wallets\/\d+\/transfers$/, { timeout: 15_000 });
    const srcMatch = page.url().match(/\/wallets\/(\d+)\/transfers$/);
    if (srcMatch) sourceWalletId = parseInt(srcMatch[1]);

    // Both IDs must be captured for the transfer and cleanup to work
    expect(sourceWalletId).toBeDefined();
    expect(destWalletId).toBeDefined();

    // ── Open the create transfer form ─────────────────────────────────────────
    await sel.walletTransferList.createLink(page, sourceWalletId!).click();
    await page.waitForURL(/\/wallets\/\d+\/transfers\/create$/, {
      timeout: 15_000,
    });

    // Wait for the form to be ready (wallets fetched and Select options loaded)
    await expect(sel.walletTransferForm.submitButton(page)).toBeVisible({
      timeout: 15_000,
    });

    // ── Select the destination wallet ─────────────────────────────────────────
    await sel.walletTransferForm.transferToSelect(page).click();
    await page.getByText(DEST_WALLET_NAME, { exact: true }).click();

    // ── Enter the transfer amount ─────────────────────────────────────────────
    await sel.walletTransferForm.amountInput(page).fill(
      String(TRANSFER_AMOUNT)
    );

    // ── Submit the transfer ───────────────────────────────────────────────────
    await sel.walletTransferForm.submitButton(page).click();

    // After a successful transfer the handler redirects to the source wallet's
    // transfer history page
    await page.waitForURL(`/wallets/${sourceWalletId}/transfers`, {
      timeout: 15_000,
    });
    await expect(page).toHaveURL(`/wallets/${sourceWalletId}/transfers`);
  });

  // ---------------------------------------------------------------------------
  // Test 4: Verify balances updated correctly after transfer
  // ---------------------------------------------------------------------------

  test('should verify balances updated correctly after transfer', async ({
    page,
  }) => {
    await page.goto('/wallets');

    // Source balance should have decreased by TRANSFER_AMOUNT
    await expect(
      sel.walletList.walletBalance(page, SOURCE_WALLET_NAME)
    ).toContainText(formatBalance(SOURCE_BALANCE_AFTER), { timeout: 15_000 });

    // Destination balance should have increased by TRANSFER_AMOUNT
    await expect(
      sel.walletList.walletBalance(page, DEST_WALLET_NAME)
    ).toContainText(formatBalance(DEST_BALANCE_AFTER), { timeout: 15_000 });
  });

  // ---------------------------------------------------------------------------
  // Test 5: Verify the transfer appears in the transfer history
  // ---------------------------------------------------------------------------

  test('should display the transfer in the transfer history', async ({
    page,
  }) => {
    // Navigate directly to the source wallet's transfer history
    await page.goto(`/wallets/${sourceWalletId}/transfers`);

    // The transfer list item title is the destination wallet name
    await expect(
      sel.walletTransferList.transferItem(page, DEST_WALLET_NAME)
    ).toBeVisible({ timeout: 15_000 });
  });
});
