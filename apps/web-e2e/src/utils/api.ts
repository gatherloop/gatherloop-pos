/**
 * Direct API helpers for creating and deleting test data.
 *
 * These helpers use Playwright's APIRequestContext (which carries auth cookies
 * from storageState) to call the backend API directly — no UI interaction
 * needed. This keeps test setup fast and deterministic.
 *
 * Usage in test files:
 *   test.beforeAll(async ({ request }) => {
 *     testCategory = await api.createCategory(request, { name: 'E2E Category' });
 *   });
 *   test.afterAll(async ({ request }) => {
 *     await api.deleteCategory(request, testCategory.id);
 *   });
 */

import { type APIRequestContext } from '@playwright/test';

// ---------------------------------------------------------------------------
// Types (minimal — mirrors the OpenAPI schema shapes we care about)
// ---------------------------------------------------------------------------

export interface Category {
  id: number;
  name: string;
  createdAt: string;
}

export interface Wallet {
  id: number;
  name: string;
  balance: number;
  paymentCostPercentage: number;
  isCashless: boolean;
  createdAt: string;
}

export interface Product {
  id: number;
  categoryId: number;
  name: string;
  imageUrl: string;
  saleType: 'purchase' | 'rental';
  options: Option[];
  createdAt: string;
}

export interface Option {
  id: number;
  name: string;
  values: OptionValue[];
}

export interface OptionValue {
  id: number;
  name: string;
}

export interface Budget {
  id: number;
  name: string;
  percentage: number;
  balance: number;
  createdAt: string;
}

export interface Expense {
  id: number;
  walletId: number;
  budgetId: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

async function apiPost<T>(
  request: APIRequestContext,
  path: string,
  body: unknown
): Promise<T> {
  const response = await request.post(path, { data: body });
  if (!response.ok()) {
    throw new Error(
      `POST ${path} failed: ${response.status()} ${await response.text()}`
    );
  }
  const json = await response.json();
  return json.data as T;
}

async function apiDelete(
  request: APIRequestContext,
  path: string
): Promise<void> {
  const response = await request.delete(path);
  if (!response.ok()) {
    throw new Error(
      `DELETE ${path} failed: ${response.status()} ${await response.text()}`
    );
  }
}

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export async function createCategory(
  request: APIRequestContext,
  data: { name: string }
): Promise<Category> {
  return apiPost<Category>(request, '/api/categories', data);
}

export async function deleteCategory(
  request: APIRequestContext,
  id: number
): Promise<void> {
  return apiDelete(request, `/api/categories/${id}`);
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export interface CreateWalletInput {
  name: string;
  balance: number;
  paymentCostPercentage: number;
  isCashless: boolean;
}

export async function createWallet(
  request: APIRequestContext,
  data: CreateWalletInput
): Promise<Wallet> {
  return apiPost<Wallet>(request, '/api/wallets', data);
}

export async function deleteWallet(
  request: APIRequestContext,
  id: number
): Promise<void> {
  return apiDelete(request, `/api/wallets/${id}`);
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export interface CreateProductInput {
  categoryId: number;
  name: string;
  imageUrl: string;
  description?: string;
  saleType: 'purchase' | 'rental';
  options: Array<{
    name: string;
    values: Array<{ name: string }>;
  }>;
}

export async function createProduct(
  request: APIRequestContext,
  data: CreateProductInput
): Promise<Product> {
  return apiPost<Product>(request, '/api/products', data);
}

export async function deleteProduct(
  request: APIRequestContext,
  id: number
): Promise<void> {
  return apiDelete(request, `/api/products/${id}`);
}

// ---------------------------------------------------------------------------
// Coupon
// ---------------------------------------------------------------------------

export interface Coupon {
  id: number;
  code: string;
  type: 'fixed' | 'percentage';
  amount: number;
  createdAt: string;
}

export interface CreateCouponInput {
  code: string;
  type: 'fixed' | 'percentage';
  amount: number;
}

export async function createCoupon(
  request: APIRequestContext,
  data: CreateCouponInput
): Promise<Coupon> {
  return apiPost<Coupon>(request, '/api/coupons', data);
}

export async function deleteCoupon(
  request: APIRequestContext,
  id: number
): Promise<void> {
  return apiDelete(request, `/api/coupons/${id}`);
}

// ---------------------------------------------------------------------------
// Variant
// ---------------------------------------------------------------------------

export interface Variant {
  id: number;
  productId: number;
  name: string;
  price: number;
  createdAt: string;
}

export interface CreateVariantInput {
  productId: number;
  name: string;
  price: number;
  description?: string;
  materials: Array<{ materialId: number; amount: number }>;
  values: Array<{ optionValueId: number }>;
}

export async function createVariant(
  request: APIRequestContext,
  data: CreateVariantInput
): Promise<Variant> {
  return apiPost<Variant>(request, '/api/variants', data);
}

export async function deleteVariant(
  request: APIRequestContext,
  id: number
): Promise<void> {
  return apiDelete(request, `/api/variants/${id}`);
}

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

export interface Transaction {
  id: number;
  name: string;
  total: number;
  createdAt: string;
}

export interface CreateTransactionInput {
  name: string;
  orderNumber: number;
  transactionItems: Array<{
    variantId: number;
    amount: number;
    discountAmount: number;
    note: string;
  }>;
  transactionCoupons: Array<{
    couponId: number;
  }>;
}

export async function createTransaction(
  request: APIRequestContext,
  data: CreateTransactionInput
): Promise<Transaction> {
  return apiPost<Transaction>(request, '/api/transactions', data);
}

export async function deleteTransaction(
  request: APIRequestContext,
  id: number
): Promise<void> {
  return apiDelete(request, `/api/transactions/${id}`);
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

export interface CreateBudgetInput {
  name: string;
  percentage: number;
  balance: number;
}

export async function createBudget(
  request: APIRequestContext,
  data: CreateBudgetInput
): Promise<Budget> {
  return apiPost<Budget>(request, '/api/budgets', data);
}

export async function deleteBudget(
  request: APIRequestContext,
  id: number
): Promise<void> {
  return apiDelete(request, `/api/budgets/${id}`);
}

// ---------------------------------------------------------------------------
// Expense
// ---------------------------------------------------------------------------

export interface CreateExpenseInput {
  walletId: number;
  budgetId: number;
  expenseItems: Array<{
    name: string;
    unit: string;
    price: number;
    amount: number;
  }>;
}

export async function createExpense(
  request: APIRequestContext,
  data: CreateExpenseInput
): Promise<Expense> {
  return apiPost<Expense>(request, '/api/expenses', data);
}

export async function deleteExpense(
  request: APIRequestContext,
  id: number
): Promise<void> {
  return apiDelete(request, `/api/expenses/${id}`);
}
