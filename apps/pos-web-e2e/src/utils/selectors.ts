import { type Page, type Locator } from '@playwright/test';

export const auth = {
  usernameInput: (page: Page) => page.getByLabel('Username'),
  passwordInput: (page: Page) => page.getByLabel('Password'),
  submitButton: (page: Page) => page.getByRole('button', { name: 'Submit' }),
};

export const sidebar = {
  logoutButton: (page: Page) => page.getByRole('button', { name: 'Logout' }),
  navItem: (page: Page, name: string) =>
    page.getByRole('button', { name, exact: true }),
  toggleButton: (page: Page) => page.locator('button[data-state]').first(),
};

export const common = {
  submitButton: (page: Page) => page.getByRole('button', { name: 'Submit' }),
  confirmButton: (page: Page) => page.getByRole('button', { name: 'Yes' }),
  cancelButton: (page: Page) => page.getByRole('button', { name: 'No' }),
  listItemMenuTrigger: (page: Page, itemName: string) =>
    page
      .locator('[data-testid="list-item"], [role="listitem"]')
      .filter({ hasText: itemName })
      .getByRole('button')
      .last(),
};

export const productList = {
  searchInput: (page: Page) =>
    page.getByPlaceholder('Search Products by Name'),
  createLink: (page: Page) => page.locator('a[href="/products/create"]'),
  productItem: (page: Page, name: string) =>
    page.locator('h4').filter({ hasText: name }).first(),
  menuButton: (page: Page, name: string) =>
    page
      .locator('h4')
      .filter({ hasText: name })
      .locator('../../../..')
      .getByRole('button')
      .last(),
  menuOption: (page: Page, label: 'Edit' | 'Delete') =>
    page.locator('[data-state="open"] li').filter({ hasText: label }).last(),
};

export const productForm = {
  nameInput: (page: Page) => page.getByLabel('Name'),
  categorySelect: (page: Page) => page.getByLabel('Category', { exact: true }),
  saleTypeSelect: (page: Page) => page.getByLabel('Sale Type'),
  imageUrlInput: (page: Page) => page.getByLabel('Image URL'),
  submitButton: (page: Page) => page.getByRole('button', { name: 'Submit' }),
};

export const walletList = {
  createLink: (page: Page) => page.locator('a[href="/wallets/create"]'),
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
  walletBalance: (page: Page, name: string) =>
    page
      .locator('h4')
      .filter({ hasText: name })
      .locator('..')
      .locator('p')
      .first(),
};

export const walletForm = {
  nameInput: (page: Page) => page.getByLabel('Name'),
  balanceInput: (page: Page) => page.getByLabel('Balance'),
  paymentCostInput: (page: Page) =>
    page.getByLabel('Payment Cost Percentage'),
  cashlessSwitch: (page: Page) => page.getByLabel('Cashless'),
  submitButton: (page: Page) => page.getByRole('button', { name: 'Submit' }),
};

export const transactionList = {
  createLink: (page: Page) => page.locator('a[href="/transactions/create"]'),
  transactionItem: (page: Page, name: string) =>
    page.locator('h4').filter({ hasText: name }).first(),
  searchInput: (page: Page) =>
    page.getByPlaceholder('Search Customer Name'),
  menuButton: (page: Page, name: string) =>
    page
      .locator('h4')
      .filter({ hasText: name })
      .locator('../../../..')
      .getByRole('button')
      .last(),
  menuOption: (page: Page, label: 'Pay' | 'Unpay' | 'Edit' | 'Delete') =>
    page.locator('[data-state="open"] li').filter({ hasText: label }).last(),
};

export const transactionForm = {
  customerNameInput: (page: Page) => page.getByLabel('Customer Name'),
  orderNumberInput: (page: Page) => page.getByLabel('Order Number'),
  productSearchInput: (page: Page) =>
    page.getByPlaceholder('Search Products by Name'),
  productCard: (page: Page, name: string) =>
    page.locator('h4').filter({ hasText: name }).first(),
  addCouponButton: (page: Page) =>
    page
      .locator('h4')
      .filter({ hasText: 'Coupons' })
      .locator('xpath=..')
      .getByRole('button'),
  submitButton: (page: Page) =>
    page.getByRole('button', { name: 'Submit' }).first(),
  totalHeading: (page: Page) => page.locator('h3').last(),
};

export const transactionCartButton = {
  button: (page: Page) => page.getByRole('button', { name: /View Cart$/ }),
};

export const transactionCartSheet = {
  title: (page: Page) => page.locator('h4').filter({ hasText: 'Cart' }).first(),
  closeButton: (page: Page) =>
    page.getByRole('button', { name: 'Close Cart' }),
  backButton: (page: Page) =>
    page.getByRole('button', { name: 'Back to Cart' }),
};

export const transactionPayDialog = {
  walletSelect: (page: Page) =>
    page.getByRole('alertdialog').getByLabel('Wallet Name'),
  submitButton: (page: Page) =>
    page.getByRole('alertdialog').getByRole('button', { name: 'Submit' }),
};

export const transactionPrintDialog = {
  printInvoiceDialog: (page: Page) =>
    page.locator('[role="alertdialog"]').filter({ hasText: 'Print Invoice' }),
  printOrderSlipDialog: (page: Page) =>
    page.locator('[role="alertdialog"]').filter({ hasText: 'Print Order Slip' }),
  clickNo: async (dialog: Locator) =>
    dialog.locator('button').first().click({ force: true }),
};

export const rentalCheckinForm = {
  productSearchInput: (page: Page) =>
    page.getByPlaceholder('Search Products by Name'),
  productCard: (page: Page, name: string) =>
    page.locator('h4').filter({ hasText: name }).first(),
  customerNameInput: (page: Page) => page.getByLabel('Customer Name'),
  codeInput: (page: Page) => page.getByPlaceholder('Code'),
  submitButton: (page: Page) =>
    page.getByRole('button', { name: 'Submit' }).first(),
};

export const rentalCartButton = {
  button: (page: Page) => page.getByRole('button', { name: /View Cart$/ }),
};

export const rentalCartSheet = {
  title: (page: Page) => page.locator('h4').filter({ hasText: 'Cart' }).first(),
  closeButton: (page: Page) =>
    page.getByRole('button', { name: 'Close Cart' }),
};

export const rentalPrintDialog = {
  printCheckinSlipDialog: (page: Page) =>
    page
      .locator('[role="alertdialog"]')
      .filter({ hasText: 'Print Checkin Slip' }),
  clickNo: async (dialog: Locator) =>
    dialog.locator('button').first().click({ force: true }),
};

export const rentalCheckoutCartButton = {
  button: (page: Page) => page.getByRole('button', { name: /View Cart$/ }),
};

export const rentalCheckoutCartSheet = {
  title: (page: Page) => page.locator('h4').filter({ hasText: 'Cart' }).first(),
  closeButton: (page: Page) =>
    page.getByRole('button', { name: 'Close Cart' }),
  submitButton: (page: Page) =>
    page.getByRole('button', { name: 'Submit' }).first(),
};

export const rentalList = {
  searchInput: (page: Page) => page.getByPlaceholder('Search Rental by Code'),
  rentalItem: (page: Page, name: string) =>
    page.locator('h4').filter({ hasText: name }).first(),
};

export const walletTransferForm = {
  transferToSelect: (page: Page) => page.getByLabel('Transfer To'),
  amountInput: (page: Page) => page.getByLabel('Amount'),
  submitButton: (page: Page) => page.getByRole('button', { name: 'Submit' }),
};

export const walletTransferList = {
  createLink: (page: Page, walletId: number) =>
    page.locator(`a[href="/wallets/${walletId}/transfers/create"]`),
  transferItem: (page: Page, toWalletName: string) =>
    page.locator('h4').filter({ hasText: toWalletName }).first(),
};

export const budgetList = {
  budgetItem: (page: Page, name: string) =>
    page.locator('h4').filter({ hasText: name }).first(),
  budgetTargetPercentage: (page: Page, name: string) =>
    page
      .locator('h4')
      .filter({ hasText: name })
      .locator('../../../..')
      .locator('p')
      .last(),
};

export const stockCheckForm = {
  searchInput: (page: Page) =>
    page.getByPlaceholder('Search material by name'),
  pendingFilterButton: (page: Page, label: 'Show only pending' | 'Show all materials') =>
    page.getByRole('button', { name: label }),
  materialRow: (page: Page, materialName: string) =>
    page.locator('label').filter({ hasText: materialName }).locator('xpath=../..'),
  materialInput: (page: Page, materialName: string) =>
    stockCheckForm.materialRow(page, materialName).locator('input'),
  materialIncrementButton: (page: Page, materialName: string) =>
    stockCheckForm.materialRow(page, materialName).getByRole('button').last(),
  pendingBadge: (page: Page, materialName: string) =>
    stockCheckForm.materialRow(page, materialName).getByText('Pending'),
  errorBanner: (page: Page) =>
    page.getByText(/materials? still need a stock count/),
  submitButton: (page: Page) => page.getByRole('button', { name: 'Submit' }).first(),
};

export const stockCheckList = {
  createLink: (page: Page) => page.locator('a[href="/stock-checks/create"]'),
};

export const expenseList = {
  createLink: (page: Page) => page.locator('a[href="/expenses/create"]'),
  expenseItemByBudget: (page: Page, budgetName: string) =>
    page.locator('h4').filter({ hasText: budgetName }).first(),
  filterButton: (page: Page) =>
    page.getByRole('button', { name: 'Filter' }),
};

export const expenseForm = {
  walletSelect: (page: Page) => page.getByLabel('Wallet Name'),
  budgetSelect: (page: Page) => page.getByLabel('Budget Name'),
  addItemButton: (page: Page) =>
    page
      .locator('h4')
      .filter({ hasText: 'Expense Items' })
      .locator('xpath=..')
      .getByRole('button'),
  itemNameInput: (page: Page) => page.getByLabel('Item Name').first(),
  itemAmountInput: (page: Page) => page.getByLabel('Amount').first(),
  itemUnitInput: (page: Page) => page.getByLabel('Unit').first(),
  itemPriceInput: (page: Page) => page.getByLabel('Price').first(),
  submitButton: (page: Page) => page.getByRole('button', { name: 'Submit' }),
};
