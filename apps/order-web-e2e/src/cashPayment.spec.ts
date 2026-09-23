import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';
import { formatRupiah } from './utils/format';

const TS = Date.now();
const CATEGORY_NAME = `E2E Cash Kategori ${TS}`;
const PRODUCT_NAME = `E2E Cash Kopi ${TS}`;
const TABLE_LABEL = `E2E Cash Meja ${TS}`;
const CUSTOMER_NAME = `E2E Cash Tamu ${TS}`;
const PRICE = 24000;

test.describe.serial('Cash Payment Checkout', () => {
  let category: api.Category;
  let product: api.Product;
  let variant: api.Variant;
  let table: api.Table;
  let wallet: api.Wallet;

  test.beforeAll(async () => {
    category = await api.createCategory({ name: CATEGORY_NAME, station: 'NONE' });
    product = await api.createProduct({
      categoryId: category.id,
      name: PRODUCT_NAME,
      imageUrl: '',
      saleType: 'purchase',
      status: 'published',
      options: [{ name: 'Ukuran', values: [{ name: 'Reguler' }] }],
    });
    variant = await api.createVariant({
      productId: product.id,
      name: 'Reguler',
      price: PRICE,
      materials: [],
      values: [{ optionValueId: product.options[0].values[0].id }],
    });
    table = await api.createTable({ label: TABLE_LABEL });
    wallet = await api.getWallet(Number(process.env['ORDER_PAYMENT_WALLET_ID']));
  });

  test.afterAll(async () => {
    // The order transaction created below is paid, and DeleteTransactionById
    // rejects paid transactions — same as checkout.spec.ts, it is left behind
    // in the throwaway per-run CI database rather than deleted here.
    const cleanup = [
      () => api.deleteVariant(variant.id),
      () => api.deleteProduct(product.id),
      () => api.deleteCategory(category.id),
      () => api.deleteTable(table.id),
    ];
    for (const step of cleanup) {
      await step().catch(() => {
        // Ignore — the row may not exist if an earlier step failed.
      });
    }
  });

  test('a guest builds a cart, checks out for cash and lands on the prepared-order screen once the cashier collects payment', async ({
    page,
  }) => {
    const balanceBeforePayment = wallet.balance;

    await page.goto(`t/${table.code}`);
    await sel.menuList.productCard(page, PRODUCT_NAME).click();
    await sel.itemDetail.optionValueChip(page, 'Reguler').click();
    await sel.itemDetail.addToCartButton(page).click();
    await sel.cartBar.viewCartButton(page).click();
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();

    await sel.cartScreen.checkoutButton(page, formatRupiah(PRICE)).click();

    await expect(sel.cartScreen.nameInput(page)).toBeVisible();
    await sel.cartScreen.fillCustomerDetails(page, CUSTOMER_NAME);
    await sel.cartScreen.cashMethodButton(page).click();

    const checkoutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/carts/current/checkout') &&
        response.request().method() === 'POST'
    );
    await sel.cartScreen.submitCashButton(page).click();
    const checkoutResponse = await checkoutResponsePromise;
    const { data: payment } = await checkoutResponse.json();
    expect(payment.method).toBe('cash');
    const partnerReferenceNo: string = payment.partnerReferenceNo;
    expect(partnerReferenceNo).toBeTruthy();

    await expect(page).toHaveURL(
      new RegExp(`/orders/${partnerReferenceNo}$`),
      { timeout: 5_000 }
    );
    await expect(sel.orderStatus.cashHeading(page, 'Lantai 1')).toBeVisible();
    await expect(
      sel.orderStatus.transactionNumberBadge(page, payment.transactionNumber)
    ).toBeVisible();
    await expect(sel.orderStatus.waitingForCashPaymentText(page)).toBeVisible();

    // The cashier's ordinary POS pay flow is the cash gateway (FR-6) — no separate confirm step.
    const [transaction] = await api.findTransactionsByQuery(CUSTOMER_NAME);
    expect(transaction).toBeTruthy();
    await api.payTransaction(transaction.id, wallet.id, PRICE);

    await expect(sel.orderStatus.preparingTitle(page)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      sel.orderStatus.transactionNumberBadge(page, payment.transactionNumber)
    ).toBeVisible();

    await page.reload();
    await expect(sel.orderStatus.preparingTitle(page)).toBeVisible({
      timeout: 15_000,
    });

    const walletAfterPayment = await api.getWallet(wallet.id);
    expect(walletAfterPayment.balance).toBeGreaterThan(balanceBeforePayment);
  });
});
