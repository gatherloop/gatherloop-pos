import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';
import * as db from './utils/db';
import { formatRupiah } from './utils/format';
import { markPaid } from './utils/dokuStub';

const TS = Date.now();
const CATEGORY_NAME = `E2E Whatsapp Kategori ${TS}`;
const PRODUCT_NAME = `E2E Whatsapp Kopi ${TS}`;
const TABLE_LABEL = `E2E Whatsapp Meja ${TS}`;
const CUSTOMER_NAME = `E2E Whatsapp Tamu ${TS}`;
const PRICE = 21000;

// Typed with separators to prove the server normalizes it (D2 in
// docs/prd-order-whatsapp-notifications.md) — the prefill on the next
// order is expected back in this stripped, 0-prefixed shape, not verbatim.
const RAW_WHATSAPP_NUMBER = '0812-3456-7890';
const NORMALIZED_WHATSAPP_NUMBER = '6281234567890';
const PREFILLED_WHATSAPP_NUMBER = '081234567890';

test.describe.serial('WhatsApp order-ready notification', () => {
  let category: api.Category;
  let product: api.Product;
  let variant: api.Variant;
  let table: api.Table;
  let partnerReferenceNo: string;
  let transactionNumber: number;
  let transactionId: number;

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
  });

  test.afterAll(async () => {
    // The order below is paid, and DeleteTransactionById rejects paid
    // transactions — same as checkout.spec.ts, it is left behind in the
    // throwaway per-run CI database rather than deleted here.
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

  test('the number is normalized, prefilled on the next order, and the outbox row is sent through the Fonnte stub', async ({
    page,
  }) => {
    await page.goto(`t/${table.code}`);
    await sel.menuList.productCard(page, PRODUCT_NAME).click();
    await sel.itemDetail.optionValueChip(page, 'Reguler').click();
    await sel.itemDetail.addToCartButton(page).click();
    await sel.cartBar.viewCartButton(page).click();
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();

    await sel.cartScreen.checkoutButton(page, formatRupiah(PRICE)).click();
    await sel.cartScreen.fillCustomerDetails(
      page,
      CUSTOMER_NAME,
      RAW_WHATSAPP_NUMBER
    );

    const checkoutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/carts/current/checkout') &&
        response.request().method() === 'POST'
    );
    await sel.cartScreen.submitNameButton(page).click();
    const checkoutResponse = await checkoutResponsePromise;
    const { data: payment } = await checkoutResponse.json();
    partnerReferenceNo = payment.partnerReferenceNo;
    transactionNumber = payment.transactionNumber;
    expect(partnerReferenceNo).toBeTruthy();

    await markPaid(partnerReferenceNo);
    await expect(sel.orderStatus.preparingTitle(page)).toBeVisible({
      timeout: 10_000,
    });

    const [transaction] = await api.findTransactionsByQuery(CUSTOMER_NAME);
    expect(transaction).toBeTruthy();
    transactionId = transaction.id;

    // Starting a second order from the same browser session prefills the
    // sheet from what the server just saved (FR-4), normalized and
    // reformatted, not the punctuated text the guest actually typed.
    await page.goto(`t/${table.code}`);
    await sel.menuList.productCard(page, PRODUCT_NAME).click();
    await sel.itemDetail.optionValueChip(page, 'Reguler').click();
    await sel.itemDetail.addToCartButton(page).click();
    await sel.cartBar.viewCartButton(page).click();
    await sel.cartScreen.checkoutButton(page, formatRupiah(PRICE)).click();

    await expect(sel.cartScreen.nameInput(page)).toHaveValue(CUSTOMER_NAME);
    await expect(sel.cartScreen.whatsappNumberInput(page)).toHaveValue(
      PREFILLED_WHATSAPP_NUMBER
    );
    await sel.cartScreen.cancelNameButton(page).click();

    await api.completeTransaction(transactionId);

    // guest_notifications.status only settles once TriggerDispatch's
    // goroutine runs — see FR-7 in docs/prd-order-whatsapp-notifications.md.
    // Phase 8 of docs/prd-order-whatsapp-number-validation.md points
    // FONNTE_BASE_URL at cmd/fonntestub for the whole e2e run (needed so
    // whatsappNumberValidation.spec.ts's ValidateNumber calls actually reach
    // something), so the gateway here is no longer the disabled stand-in —
    // the stub's own /send accepts, same as a real linked device would.
    await expect
      .poll(
        async () =>
          (await db.getGuestNotificationsForTransaction(transactionId))[0]
            ?.status,
        { timeout: 15_000 }
      )
      .toBe('sent');

    let rows = await db.getGuestNotificationsForTransaction(transactionId);
    expect(rows).toHaveLength(1);
    expect(rows[0].whatsappNumber).toBe(NORMALIZED_WHATSAPP_NUMBER);
    expect(rows[0].detail).toBeNull();

    // D6: un-marking and re-marking the same order never enqueues a second
    // message — the UNIQUE(transaction_id) insert is a no-op.
    await api.uncompleteTransaction(transactionId);
    await api.completeTransaction(transactionId);

    rows = await db.getGuestNotificationsForTransaction(transactionId);
    expect(rows).toHaveLength(1);
  });

  test('the order-ready link opens the ready view in a fresh browser context, on the access key alone', async ({
    browser,
  }) => {
    const accessKey = await db.getPaymentAccessKey(partnerReferenceNo);

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`orders/${partnerReferenceNo}?k=${accessKey}`);

    await expect(sel.orderStatus.readyTitle(page)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      sel.orderStatus.transactionNumberBadge(page, transactionNumber)
    ).toBeVisible();
    await expect(
      sel.orderStatus.pickupInstructionText(page, transactionNumber)
    ).toBeVisible();

    await context.close();
  });
});
