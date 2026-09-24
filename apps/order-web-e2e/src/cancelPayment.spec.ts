import { test, expect, Page } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';
import { formatRupiah } from './utils/format';
import { markPaid } from './utils/dokuStub';

const TS = Date.now();
const CATEGORY_NAME = `E2E Cancel Kategori ${TS}`;
const PRODUCT_NAME = `E2E Cancel Kopi ${TS}`;
const PRODUCT_NAME_2 = `E2E Cancel Teh ${TS}`;
const TABLE_LABEL = `E2E Cancel Meja ${TS}`;
const CUSTOMER_NAME = `E2E Cancel Tamu ${TS}`;
const PRICE = 21000;
const PRICE_2 = 16000;

test.describe.serial('Payment Cancellation', () => {
  let category: api.Category;
  let product: api.Product;
  let variant: api.Variant;
  let product2: api.Product;
  let variant2: api.Variant;
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
    product2 = await api.createProduct({
      categoryId: category.id,
      name: PRODUCT_NAME_2,
      imageUrl: '',
      saleType: 'purchase',
      status: 'published',
      options: [{ name: 'Ukuran', values: [{ name: 'Reguler' }] }],
    });
    variant2 = await api.createVariant({
      productId: product2.id,
      name: 'Reguler',
      price: PRICE_2,
      materials: [],
      values: [{ optionValueId: product2.options[0].values[0].id }],
    });
    table = await api.createTable({ label: TABLE_LABEL });
    wallet = await api.getWallet(Number(process.env['ORDER_PAYMENT_WALLET_ID']));
  });

  test.afterAll(async () => {
    // Every payment below either stays paid (scenario 3) or leaves behind a
    // soft-deleted, cancelled transaction (D17) — both reject
    // DeleteTransactionById, same as checkout.spec.ts, so they're left in the
    // throwaway per-run CI database rather than deleted here.
    const cleanup = [
      () => api.deleteVariant(variant2.id),
      () => api.deleteProduct(product2.id),
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

  const addProductToCart = async (page: Page, productName: string) => {
    await sel.menuList.productCard(page, productName).click();
    await sel.itemDetail.optionValueChip(page, 'Reguler').click();
    await sel.itemDetail.addToCartButton(page).click();
  };

  const checkoutViaQris = async (page: Page, customerName: string) => {
    await sel.cartBar.viewCartButton(page).click();
    await sel.cartScreen.checkoutButton(page, formatRupiah(PRICE)).click();
    await sel.cartScreen.fillCustomerDetails(page, customerName);

    const checkoutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/carts/current/checkout') &&
        response.request().method() === 'POST'
    );
    await sel.cartScreen.submitNameButton(page).click();
    const checkoutResponse = await checkoutResponsePromise;
    const { data: payment } = await checkoutResponse.json();
    expect(payment.partnerReferenceNo).toBeTruthy();

    await expect(page).toHaveURL(new RegExp(`/orders/${payment.partnerReferenceNo}$`), {
      timeout: 5_000,
    });
    return payment as {
      partnerReferenceNo: string;
      transactionNumber: number;
      method: string;
    };
  };

  const checkoutViaCash = async (page: Page, customerName: string) => {
    await sel.cartBar.viewCartButton(page).click();
    await sel.cartScreen.checkoutButton(page, formatRupiah(PRICE)).click();
    await sel.cartScreen.fillCustomerDetails(page, customerName);
    await sel.cartScreen.cashMethodButton(page).click();

    const checkoutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/carts/current/checkout') &&
        response.request().method() === 'POST'
    );
    await sel.cartScreen.submitCashButton(page).click();
    const checkoutResponse = await checkoutResponsePromise;
    const { data: payment } = await checkoutResponse.json();
    expect(payment.partnerReferenceNo).toBeTruthy();

    await expect(page).toHaveURL(new RegExp(`/orders/${payment.partnerReferenceNo}$`), {
      timeout: 5_000,
    });
    return payment as {
      partnerReferenceNo: string;
      transactionNumber: number;
      method: string;
    };
  };

  test('1. a guest cancels a pending QRIS payment, edits the returned cart, and checks out again with cash', async ({
    page,
  }) => {
    const customerName = `${CUSTOMER_NAME} S1`;
    await page.goto(`t/${table.code}`);
    await addProductToCart(page, PRODUCT_NAME);
    const payment = await checkoutViaQris(page, customerName);

    await expect(sel.orderStatus.saveQrButton(page)).toBeVisible();
    await expect(sel.orderStatus.waitingForPaymentText(page)).toBeVisible();

    await sel.orderStatus.cancelPaymentButton(page).click();
    await expect(sel.paymentCancelDialog.title(page)).toBeVisible();

    const cancelResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/payments/${payment.partnerReferenceNo}/cancel`) &&
        response.request().method() === 'POST'
    );
    await sel.paymentCancelDialog.confirmButton(page).click();
    const cancelResponse = await cancelResponsePromise;
    const { data: cancelledPayment } = await cancelResponse.json();
    expect(cancelledPayment.status).toBe('cancelled');

    // D2/D15: back on the cart, with the item intact and editable, never a
    // dead end on the cancelled countdown.
    await expect(page).toHaveURL(new RegExp(`/t/${table.code}/cart$`));
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();

    await sel.cartScreen.increaseAmountButton(page).click();

    // Goal 3: check out again straight away, with a different method. The
    // doubled total on this button proves the edit above actually landed.
    await expect(
      sel.cartScreen.checkoutButton(page, formatRupiah(PRICE * 2))
    ).toBeVisible();
    await sel.cartScreen.checkoutButton(page, formatRupiah(PRICE * 2)).click();
    await sel.cartScreen.fillCustomerDetails(page, customerName);
    await sel.cartScreen.cashMethodButton(page).click();

    const secondCheckoutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/carts/current/checkout') &&
        response.request().method() === 'POST'
    );
    await sel.cartScreen.submitCashButton(page).click();
    const secondCheckoutResponse = await secondCheckoutResponsePromise;
    const { data: secondPayment } = await secondCheckoutResponse.json();
    expect(secondPayment.method).toBe('cash');
    expect(secondPayment.partnerReferenceNo).not.toBe(payment.partnerReferenceNo);

    await expect(page).toHaveURL(new RegExp(`/orders/${secondPayment.partnerReferenceNo}$`));
    await expect(sel.orderStatus.cashHeading(page, 'Lantai 1')).toBeVisible();
  });

  test('2. Back opens the cancel confirmation for a pending cash payment; dismissing keeps the countdown, confirming returns to the cart', async ({
    page,
  }) => {
    const customerName = `${CUSTOMER_NAME} S2`;
    await page.goto(`t/${table.code}`);
    await addProductToCart(page, PRODUCT_NAME);
    await checkoutViaCash(page, customerName);

    await expect(sel.orderStatus.cashHeading(page, 'Lantai 1')).toBeVisible();
    await expect(sel.orderStatus.waitingForCashPaymentText(page)).toBeVisible();
    const statusUrl = page.url();

    await page.goBack();

    // D14: the guard swallows the pop and opens the same confirmation instead
    // of silently leaving the guest on the cart page.
    await expect(sel.paymentCancelDialog.title(page)).toBeVisible();
    await expect(page).toHaveURL(statusUrl);

    await sel.paymentCancelDialog.dismissButton(page).click();
    await expect(sel.paymentCancelDialog.title(page)).toBeHidden();
    await expect(page).toHaveURL(statusUrl);
    await expect(sel.orderStatus.waitingForCashPaymentText(page)).toBeVisible();

    await page.goBack();
    await expect(sel.paymentCancelDialog.title(page)).toBeVisible();

    const cancelResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/cancel') && response.request().method() === 'POST'
    );
    await sel.paymentCancelDialog.confirmButton(page).click();
    await cancelResponsePromise;

    // D15: router.replace, so Back from the cart never lands on the dead countdown.
    await expect(page).toHaveURL(new RegExp(`/t/${table.code}/cart$`));
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();
  });

  test('3. cancelling a QRIS payment DOKU already paid lands on preparing, not the cart', async ({
    page,
  }) => {
    const customerName = `${CUSTOMER_NAME} S3`;
    await page.goto(`t/${table.code}`);
    await addProductToCart(page, PRODUCT_NAME);
    const payment = await checkoutViaQris(page, customerName);

    await expect(sel.orderStatus.saveQrButton(page)).toBeVisible();
    const cancelButton = sel.orderStatus.cancelPaymentButton(page);
    await expect(cancelButton).toBeVisible();

    await markPaid(payment.partnerReferenceNo);

    // D4: cancel re-queries DOKU first. Clicking through right after
    // markPaid — well inside the 3s awaiting-payment poll interval
    // (libs/ui/src/domain/usecases/orderStatus.ts) — proves it's the cancel
    // call's own query that catches the payment, not the guest's own poll
    // having already flipped the screen to preparing.
    await cancelButton.click();
    const cancelResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/payments/${payment.partnerReferenceNo}/cancel`) &&
        response.request().method() === 'POST'
    );
    await sel.paymentCancelDialog.confirmButton(page).click();
    const cancelResponse = await cancelResponsePromise;
    const { data: resultPayment } = await cancelResponse.json();
    expect(resultPayment.status).toBe('paid');

    await expect(sel.orderStatus.preparingTitle(page)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(new RegExp(`/orders/${payment.partnerReferenceNo}$`));
  });

  test('4. a cashier cannot pay a cash order the guest already cancelled', async ({ page }) => {
    const customerName = `${CUSTOMER_NAME} S4`;
    await page.goto(`t/${table.code}`);
    await addProductToCart(page, PRODUCT_NAME);
    await checkoutViaCash(page, customerName);

    // Captured while the order is still pending — the same "stale POS list"
    // a cashier would already have open before the guest cancels (D8).
    const [transaction] = await api.findTransactionsByQuery(customerName);
    expect(transaction).toBeTruthy();

    await sel.orderStatus.cancelPaymentButton(page).click();
    const cancelResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/cancel') && response.request().method() === 'POST'
    );
    await sel.paymentCancelDialog.confirmButton(page).click();
    await cancelResponsePromise;
    await expect(page).toHaveURL(new RegExp(`/t/${table.code}/cart$`));

    const status = await api.payTransactionRaw(transaction.id, wallet.id, PRICE);
    expect(status).toBe(400);
  });

  test('5. reopening the table after leaving a pending QRIS payment offers "cancel and add" from the item sheet', async ({
    page,
  }) => {
    const customerName = `${CUSTOMER_NAME} S5`;
    await page.goto(`t/${table.code}`);
    await addProductToCart(page, PRODUCT_NAME);
    const payment = await checkoutViaQris(page, customerName);
    await expect(sel.orderStatus.saveQrButton(page)).toBeVisible();

    // The guest closes the tab and later scans the table QR again — same
    // session (cookies), a brand new page.
    const freshPage = await page.context().newPage();
    await freshPage.goto(`t/${table.code}`);

    await expect(sel.pendingPayment.bar(freshPage, 'QRIS')).toBeVisible();

    await sel.menuList.productCard(freshPage, PRODUCT_NAME_2).click();
    await sel.itemDetail.optionValueChip(freshPage, 'Reguler').click();
    await expect(sel.pendingPayment.noticeText(freshPage)).toBeVisible();
    await expect(sel.itemDetail.addToCartButton(freshPage)).toBeHidden();

    await sel.pendingPayment.cancelAndAddButton(freshPage).click();
    await expect(sel.paymentCancelDialog.title(freshPage)).toBeVisible();

    const cancelResponsePromise = freshPage.waitForResponse(
      (response) =>
        response.url().includes(`/payments/${payment.partnerReferenceNo}/cancel`) &&
        response.request().method() === 'POST'
    );
    await sel.paymentCancelDialog.confirmButton(freshPage).click();
    await cancelResponsePromise;

    // D22: the sheet closes itself once the add completes, no extra navigation.
    await expect(freshPage).toHaveURL(new RegExp(`/t/${table.code}$`));

    await sel.cartBar.viewCartButton(freshPage).click();
    await expect(sel.cartScreen.lineItemName(freshPage, PRODUCT_NAME)).toBeVisible();
    await expect(sel.cartScreen.lineItemName(freshPage, PRODUCT_NAME_2)).toBeVisible();

    await freshPage.close();
  });

  test('6. reopening the cart while a cash payment is pending shows a locked banner that returns to the countdown', async ({
    page,
  }) => {
    const customerName = `${CUSTOMER_NAME} S6`;
    await page.goto(`t/${table.code}`);
    await addProductToCart(page, PRODUCT_NAME);
    const payment = await checkoutViaCash(page, customerName);
    await expect(sel.orderStatus.cashHeading(page, 'Lantai 1')).toBeVisible();

    await page.goto(`t/${table.code}/cart`);

    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();
    await expect(sel.cartScreen.editButton(page, PRODUCT_NAME)).toBeHidden();
    await expect(
      sel.cartScreen.checkoutButton(page, formatRupiah(PRICE))
    ).toBeHidden();
    await expect(sel.pendingPayment.noticeText(page)).toBeVisible();

    await sel.pendingPayment.continueButton(page).click();

    await expect(page).toHaveURL(new RegExp(`/orders/${payment.partnerReferenceNo}$`));
    await expect(sel.orderStatus.cashHeading(page, 'Lantai 1')).toBeVisible();
  });

  test('7. a pending QRIS payment appears in order history and reopens the countdown', async ({
    page,
  }) => {
    const customerName = `${CUSTOMER_NAME} S7`;
    await page.goto(`t/${table.code}`);
    await addProductToCart(page, PRODUCT_NAME);
    const payment = await checkoutViaQris(page, customerName);
    await expect(sel.orderStatus.saveQrButton(page)).toBeVisible();

    await sel.orderBrandHeader.historyButton(page).click();
    await expect(page).toHaveURL(/\/orders$/);

    const row = sel.orderHistory.row(page, payment.transactionNumber);
    await expect(row).toBeVisible();
    await expect(sel.orderHistory.pendingQrisLabel(page)).toBeVisible();

    await row.click();
    await expect(page).toHaveURL(new RegExp(`/orders/${payment.partnerReferenceNo}$`));
    await expect(sel.orderStatus.saveQrButton(page)).toBeVisible();
  });
});
