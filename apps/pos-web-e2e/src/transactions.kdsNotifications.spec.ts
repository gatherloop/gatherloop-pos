import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import { getKdsNotificationStatuses } from './utils/db';

const TS = Date.now();
const NONE_CATEGORY_NAME = `E2E Kds None Kategori ${TS}`;
const BAR_CATEGORY_NAME = `E2E Kds Bar Kategori ${TS}`;
const NONE_PRODUCT_NAME = `E2E Kds None Product ${TS}`;
const BAR_PRODUCT_NAME = `E2E Kds Bar Product ${TS}`;
const WALLET_NAME = `E2E Kds Wallet ${TS}`;
const PRICE = 20_000;

test.describe.serial('KDS notification enqueue on payment', () => {
  let noneCategory: api.Category;
  let barCategory: api.Category;
  let noneVariant: api.Variant;
  let barVariant: api.Variant;
  let wallet: api.Wallet;

  let noneProduct: api.Product;
  let barProduct: api.Product;

  test.beforeAll(async ({ request }) => {
    noneCategory = await api.createCategory(request, {
      name: NONE_CATEGORY_NAME,
    });
    barCategory = await api.createCategory(request, {
      name: BAR_CATEGORY_NAME,
      station: 'BAR',
    });

    noneProduct = await api.createProduct(request, {
      categoryId: noneCategory.id,
      name: NONE_PRODUCT_NAME,
      imageUrl: 'https://placehold.co/400x400.jpg',
      saleType: 'purchase',
      options: [{ name: 'Size', values: [{ name: 'Standard' }] }],
    });
    barProduct = await api.createProduct(request, {
      categoryId: barCategory.id,
      name: BAR_PRODUCT_NAME,
      imageUrl: 'https://placehold.co/400x400.jpg',
      saleType: 'purchase',
      options: [{ name: 'Size', values: [{ name: 'Standard' }] }],
    });

    const noneOptionValueId = noneProduct.options[0]?.values[0]?.id;
    const barOptionValueId = barProduct.options[0]?.values[0]?.id;
    if (!noneOptionValueId || !barOptionValueId) {
      throw new Error('Product option value ID missing from API response');
    }

    noneVariant = await api.createVariant(request, {
      productId: noneProduct.id,
      name: 'Standard',
      price: PRICE,
      materials: [],
      values: [{ optionValueId: noneOptionValueId }],
    });
    barVariant = await api.createVariant(request, {
      productId: barProduct.id,
      name: 'Standard',
      price: PRICE,
      materials: [],
      values: [{ optionValueId: barOptionValueId }],
    });

    wallet = await api.createWallet(request, {
      name: WALLET_NAME,
      balance: 0,
      paymentCostPercentage: 0,
      isCashless: true,
    });
  });

  test.afterAll(async ({ request }) => {
    // Both transactions created below get paid, and DeleteTransactionById
    // rejects paid transactions (same as transactions.fulfillment.spec.ts),
    // so they are left behind in the throwaway per-run CI database.
    await api.deleteVariant(request, noneVariant.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteVariant(request, barVariant.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteProduct(request, noneProduct.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteProduct(request, barProduct.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteCategory(request, noneCategory.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteCategory(request, barCategory.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteWallet(request, wallet.id).catch(() => {
      // Ignore — may already be gone
    });
  });

  test('paying a transaction whose only item is in a NONE-station category enqueues no row', async ({
    request,
  }) => {
    const transaction = await api.createTransaction(request, {
      name: `E2E Kds None Customer ${TS}`,
      pagerNumber: 1,
      transactionItems: [
        { variantId: noneVariant.id, amount: 1, discountAmount: 0, note: '' },
      ],
      transactionCoupons: [],
    });

    await api.payTransaction(request, transaction.id, {
      walletId: wallet.id,
      paidAmount: transaction.total,
    });

    const statuses = await getKdsNotificationStatuses(transaction.id);
    expect(statuses).toHaveLength(0);
  });

  test('paying a transaction with a BAR-station item enqueues exactly one row', async ({
    request,
  }) => {
    const transaction = await api.createTransaction(request, {
      name: `E2E Kds Bar Customer ${TS}`,
      pagerNumber: 2,
      transactionItems: [
        { variantId: barVariant.id, amount: 1, discountAmount: 0, note: '' },
      ],
      transactionCoupons: [],
    });

    await api.payTransaction(request, transaction.id, {
      walletId: wallet.id,
      paidAmount: transaction.total,
    });

    const statuses = await getKdsNotificationStatuses(transaction.id);
    expect(statuses).toHaveLength(1);
  });
});
