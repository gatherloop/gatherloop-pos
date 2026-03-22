/**
 * Shared locator helpers organized by feature area.
 *
 * Design: lightweight functions returning Playwright Locators — no full Page
 * Object classes. Keep this file as the single source of truth for element
 * discovery so that UI changes only require updates here.
 *
 * Convention:
 *   import * as sel from './utils/selectors';
 *   await sel.auth.usernameInput(page).fill('admin');
 */

import { type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const auth = {
  usernameInput: (page: Page) => page.getByLabel('Username'),
  passwordInput: (page: Page) => page.getByLabel('Password'),
  submitButton: (page: Page) => page.getByRole('button', { name: 'Submit' }),
};

// ---------------------------------------------------------------------------
// Sidebar / Navigation
// ---------------------------------------------------------------------------

export const sidebar = {
  logoutButton: (page: Page) => page.getByRole('button', { name: 'Logout' }),
  navItem: (page: Page, name: string) =>
    page.getByRole('button', { name, exact: true }),
  /** Open the sidebar if it is collapsed (the toggle is a ChevronsRight icon) */
  toggleButton: (page: Page) => page.locator('button[data-state]').first(),
};

// ---------------------------------------------------------------------------
// Shared / Generic
// ---------------------------------------------------------------------------

export const common = {
  /** The "Submit" button used in all forms */
  submitButton: (page: Page) => page.getByRole('button', { name: 'Submit' }),
  /** Confirmation dialog "Yes" button */
  confirmButton: (page: Page) => page.getByRole('button', { name: 'Yes' }),
  /** Confirmation dialog "No" button */
  cancelButton: (page: Page) => page.getByRole('button', { name: 'No' }),
  /** The MoreVertical "⋮" popover trigger on a list item that contains `itemName` */
  listItemMenuTrigger: (page: Page, itemName: string) =>
    page
      .locator('[data-testid="list-item"], [role="listitem"]')
      .filter({ hasText: itemName })
      .getByRole('button')
      .last(),
};

// ---------------------------------------------------------------------------
// Product list page (/products)
// ---------------------------------------------------------------------------

export const productList = {
  searchInput: (page: Page) =>
    page.getByPlaceholder('Search Products by Name'),
  createLink: (page: Page) => page.locator('a[href="/products/create"]'),
  /** A product card identified by its name heading */
  productItem: (page: Page, name: string) =>
    page.locator('h4').filter({ hasText: name }).first(),
  /** The MoreVertical menu button on the list item with the given product name */
  menuButton: (page: Page, name: string) =>
    page
      .locator('h4')
      .filter({ hasText: name })
      .locator('../../../..')
      .getByRole('button')
      .last(),
  /** Menu option text (Edit / Delete) rendered inside a popover */
  menuOption: (page: Page, label: 'Edit' | 'Delete') =>
    page.locator('[data-state="open"] li').filter({ hasText: label }).last(),
};

// ---------------------------------------------------------------------------
// Product form page (/products/create, /products/[id]/edit)
// ---------------------------------------------------------------------------

export const productForm = {
  nameInput: (page: Page) => page.getByLabel('Name'),
  categorySelect: (page: Page) => page.getByLabel('Category', { exact: true }),
  saleTypeSelect: (page: Page) => page.getByLabel('Sale Type'),
  imageUrlInput: (page: Page) => page.getByLabel('Image URL'),
  submitButton: (page: Page) => page.getByRole('button', { name: 'Submit' }),
};

// ---------------------------------------------------------------------------
// Wallet list page (/wallets)
// ---------------------------------------------------------------------------

export const walletList = {
  createLink: (page: Page) => page.locator('a[href="/wallets/create"]'),
  /** A wallet card identified by its name heading */
  walletItem: (page: Page, name: string) =>
    page.locator('h4').filter({ hasText: name }).first(),
  menuButton: (page: Page, name: string) =>
    page
      .locator('h4')
      .filter({ hasText: name })
      .locator('../../../..')
      .getByRole('button')
      .last(),
  menuOption: (page: Page, label: 'Transfer' | 'Edit' | 'Delete') =>
    page.locator('[data-state="open"] li').filter({ hasText: label }).last(),
  /** Balance text for a wallet (rendered as subtitle paragraph) */
  walletBalance: (page: Page, name: string) =>
    page
      .locator('h4')
      .filter({ hasText: name })
      .locator('..')
      .locator('p')
      .first(),
};

// ---------------------------------------------------------------------------
// Wallet form page (/wallets/create, /wallets/[id]/edit)
// ---------------------------------------------------------------------------

export const walletForm = {
  nameInput: (page: Page) => page.getByLabel('Name'),
  balanceInput: (page: Page) => page.getByLabel('Balance'),
  paymentCostInput: (page: Page) =>
    page.getByLabel('Payment Cost Percentage'),
  cashlessSwitch: (page: Page) => page.getByLabel('Cashless'),
  submitButton: (page: Page) => page.getByRole('button', { name: 'Submit' }),
};

// ---------------------------------------------------------------------------
// Transaction list page (/transactions)
// ---------------------------------------------------------------------------

export const transactionList = {
  createLink: (page: Page) =>
    page.locator('a[href="/transactions/create"]'),
  transactionItem: (page: Page, name: string) =>
    page.locator('h4').filter({ hasText: name }).first(),
};

// ---------------------------------------------------------------------------
// Transaction create page (/transactions/create)
// ---------------------------------------------------------------------------

export const transactionForm = {
  customerNameInput: (page: Page) => page.getByLabel('Customer Name'),
  orderNumberInput: (page: Page) => page.getByLabel('Order Number'),
  productSearchInput: (page: Page) =>
    page.getByPlaceholder('Search Products by Name'),
  /** A product card in the item selector panel (left side) */
  productCard: (page: Page, name: string) =>
    page.locator('h4').filter({ hasText: name }).first(),
  addCouponButton: (page: Page) =>
    page.getByRole('button', { name: /coupons/i }).last(),
  submitButton: (page: Page) => page.getByRole('button', { name: 'Submit' }),
  totalHeading: (page: Page) => page.locator('h3').last(),
};

// ---------------------------------------------------------------------------
// Wallet transfer form page (/wallets/[id]/transfers/create)
// ---------------------------------------------------------------------------

export const walletTransferForm = {
  /** "Transfer To" select dropdown trigger */
  transferToSelect: (page: Page) => page.getByLabel('Transfer To'),
  /** "Amount" number input */
  amountInput: (page: Page) => page.getByLabel('Amount'),
  submitButton: (page: Page) => page.getByRole('button', { name: 'Submit' }),
};

// ---------------------------------------------------------------------------
// Wallet transfer list page (/wallets/[id]/transfers)
// ---------------------------------------------------------------------------

export const walletTransferList = {
  /** Create transfer link — walletId is needed because it appears in the href */
  createLink: (page: Page, walletId: number) =>
    page.locator(`a[href="/wallets/${walletId}/transfers/create"]`),
  /** A transfer history item identified by the destination wallet name */
  transferItem: (page: Page, toWalletName: string) =>
    page.locator('h4').filter({ hasText: toWalletName }).first(),
};

// ---------------------------------------------------------------------------
// Budget list / form pages (/budgets)
// ---------------------------------------------------------------------------

export const budgetList = {
  createLink: (page: Page) => page.locator('a[href="/budgets/create"]'),
  budgetItem: (page: Page, name: string) =>
    page.locator('h4').filter({ hasText: name }).first(),
};

export const budgetForm = {
  nameInput: (page: Page) => page.getByLabel('Name'),
  percentageInput: (page: Page) => page.getByLabel('Percentage'),
  balanceInput: (page: Page) => page.getByLabel('Balance'),
  submitButton: (page: Page) => page.getByRole('button', { name: 'Submit' }),
};

// ---------------------------------------------------------------------------
// Expense list / form pages (/expenses)
// ---------------------------------------------------------------------------

export const expenseList = {
  createLink: (page: Page) => page.locator('a[href="/expenses/create"]'),
  expenseItem: (page: Page, index = 0) =>
    page.locator('h4').nth(index),
};

export const expenseForm = {
  walletSelect: (page: Page) => page.getByLabel('Wallet'),
  budgetSelect: (page: Page) => page.getByLabel('Budget'),
  submitButton: (page: Page) => page.getByRole('button', { name: 'Submit' }),
};
