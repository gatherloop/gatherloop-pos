import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

const TS = Date.now();
const SOURCE_WALLET_NAME = `E2E Source ${TS}`;
const DEST_WALLET_NAME = `E2E Dest ${TS}`;

const SOURCE_BALANCE = 50000;
const DEST_BALANCE = 10000;
const TRANSFER_AMOUNT = 20000;

const SOURCE_BALANCE_AFTER = SOURCE_BALANCE - TRANSFER_AMOUNT;
const DEST_BALANCE_AFTER = DEST_BALANCE + TRANSFER_AMOUNT;

function formatBalance(amount: number): string {
  return `Rp. ${amount.toLocaleString('id')}`;
}

test.describe.serial('Wallet Management', () => {
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

  test('should create two wallets (source and destination)', async ({
    page,
  }) => {
    await page.goto('/wallets/create');

    await expect(sel.walletForm.submitButton(page)).toBeVisible({
      timeout: 15_000,
    });

    await sel.walletForm.nameInput(page).fill(SOURCE_WALLET_NAME);
    await sel.walletForm.balanceInput(page).fill(String(SOURCE_BALANCE));
    await sel.walletForm.paymentCostInput(page).fill('0');

    await sel.walletForm.submitButton(page).click();
    await page.waitForURL('/wallets', { timeout: 15_000 });

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

  test('should display both wallets in the wallet list with correct initial balances', async ({
    page,
  }) => {
    await page.goto('/wallets');

    await expect(
      sel.walletList.walletItem(page, SOURCE_WALLET_NAME)
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      sel.walletList.walletItem(page, DEST_WALLET_NAME)
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      sel.walletList.walletBalance(page, SOURCE_WALLET_NAME)
    ).toContainText(formatBalance(SOURCE_BALANCE));
    await expect(
      sel.walletList.walletBalance(page, DEST_WALLET_NAME)
    ).toContainText(formatBalance(DEST_BALANCE));
  });

  test('should transfer amount from source to destination wallet', async ({
    page,
  }) => {
    await page.goto('/wallets');

    await sel.walletList.menuButton(page, DEST_WALLET_NAME).click();
    await sel.walletList.menuOption(page, 'Transfer').click();
    await page.waitForURL(/\/wallets\/\d+\/transfers$/, { timeout: 15_000 });
    const destMatch = page.url().match(/\/wallets\/(\d+)\/transfers$/);
    if (destMatch) destWalletId = parseInt(destMatch[1]);

    await page.goto('/wallets');
    await sel.walletList.menuButton(page, SOURCE_WALLET_NAME).click();
    await sel.walletList.menuOption(page, 'Transfer').click();
    await page.waitForURL(/\/wallets\/\d+\/transfers$/, { timeout: 15_000 });
    const srcMatch = page.url().match(/\/wallets\/(\d+)\/transfers$/);
    if (srcMatch) sourceWalletId = parseInt(srcMatch[1]);

    expect(sourceWalletId).toBeDefined();
    expect(destWalletId).toBeDefined();

    await sel.walletTransferList.createLink(page, sourceWalletId!).click();
    await page.waitForURL(/\/wallets\/\d+\/transfers\/create$/, {
      timeout: 15_000,
    });

    await expect(sel.walletTransferForm.submitButton(page)).toBeVisible({
      timeout: 15_000,
    });

    await sel.walletTransferForm.transferToSelect(page).click();
    await page.getByText(DEST_WALLET_NAME, { exact: true }).click();

    await sel.walletTransferForm.amountInput(page).fill(
      String(TRANSFER_AMOUNT)
    );

    await sel.walletTransferForm.submitButton(page).click();

    await page.waitForURL(`/wallets/${sourceWalletId}/transfers`, {
      timeout: 15_000,
    });
    await expect(page).toHaveURL(`/wallets/${sourceWalletId}/transfers`);
  });

  test('should verify balances updated correctly after transfer', async ({
    page,
  }) => {
    await page.goto('/wallets');

    await expect(
      sel.walletList.walletBalance(page, SOURCE_WALLET_NAME)
    ).toContainText(formatBalance(SOURCE_BALANCE_AFTER), { timeout: 15_000 });

    await expect(
      sel.walletList.walletBalance(page, DEST_WALLET_NAME)
    ).toContainText(formatBalance(DEST_BALANCE_AFTER), { timeout: 15_000 });
  });

  test('should display the transfer in the transfer history', async ({
    page,
  }) => {
    await page.goto(`/wallets/${sourceWalletId}/transfers`);

    await expect(
      sel.walletTransferList.transferItem(page, DEST_WALLET_NAME)
    ).toBeVisible({ timeout: 15_000 });
  });
});
