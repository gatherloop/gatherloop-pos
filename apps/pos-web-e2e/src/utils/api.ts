import { type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'crypto';

export type CategoryStation = 'KITCHEN' | 'BAR' | 'NONE';

export interface Category {
  id: number;
  name: string;
  station: CategoryStation;
  createdAt: string;
}

export interface Wallet {
  id: number;
  name: string;
  balance: number;
  paymentCostPercentage: number;
  isCashless: boolean;
  isPaymentTarget: boolean;
  createdAt: string;
}

export type ProductStatus = 'draft' | 'published';

export interface Product {
  id: number;
  categoryId: number;
  name: string;
  imageUrl: string;
  saleType: 'purchase' | 'rental';
  status: ProductStatus;
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
  createdAt: string;
}

export interface Expense {
  id: number;
  walletId: number;
  budgetId: number;
  createdAt: string;
}

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

async function apiPut<T>(
  request: APIRequestContext,
  path: string,
  body: unknown
): Promise<T> {
  const response = await request.put(path, { data: body });
  if (!response.ok()) {
    throw new Error(
      `PUT ${path} failed: ${response.status()} ${await response.text()}`
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

async function apiGet<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(path);
  if (!response.ok()) {
    throw new Error(
      `GET ${path} failed: ${response.status()} ${await response.text()}`
    );
  }
  const json = await response.json();
  return json.data as T;
}

export async function createCategory(
  request: APIRequestContext,
  data: { name: string; station?: CategoryStation }
): Promise<Category> {
  return apiPost<Category>(request, '/api/categories', {
    station: 'NONE',
    ...data,
  });
}

export async function deleteCategory(
  request: APIRequestContext,
  id: number
): Promise<void> {
  return apiDelete(request, `/api/categories/${id}`);
}

export interface CreateWalletInput {
  name: string;
  balance: number;
  paymentCostPercentage: number;
  isCashless: boolean;
  isPaymentTarget?: boolean;
}

export async function createWallet(
  request: APIRequestContext,
  data: CreateWalletInput
): Promise<Wallet> {
  return apiPost<Wallet>(request, '/api/wallets', {
    isPaymentTarget: true,
    ...data,
  });
}

export async function deleteWallet(
  request: APIRequestContext,
  id: number
): Promise<void> {
  return apiDelete(request, `/api/wallets/${id}`);
}

export type AvailabilityTracking = 'none' | 'product' | 'variant';

export interface CreateProductInput {
  categoryId: number;
  name: string;
  imageUrl: string;
  description?: string;
  saleType: 'purchase' | 'rental';
  status?: ProductStatus;
  availabilityTracking?: AvailabilityTracking;
  options: Array<{
    name: string;
    values: Array<{ name: string }>;
  }>;
}

export async function createProduct(
  request: APIRequestContext,
  data: CreateProductInput
): Promise<Product> {
  return apiPost<Product>(request, '/api/products', {
    status: 'published',
    ...data,
  });
}

export async function deleteProduct(
  request: APIRequestContext,
  id: number
): Promise<void> {
  return apiDelete(request, `/api/products/${id}`);
}

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
  pricingTiers?: Array<{ upToMinutes: number; price: number }>;
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

export interface Transaction {
  id: number;
  name: string;
  total: number;
  createdAt: string;
}

export interface CreateTransactionInput {
  name: string;
  pagerNumber: number;
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

export interface PayTransactionInput {
  walletId: number;
  paidAmount: number;
}

export async function payTransaction(
  request: APIRequestContext,
  id: number,
  data: PayTransactionInput
): Promise<void> {
  await apiPut(request, `/api/transactions/${id}/pay`, data);
}

export async function deleteTransaction(
  request: APIRequestContext,
  id: number
): Promise<void> {
  return apiDelete(request, `/api/transactions/${id}`);
}

export interface Ticket {
  id: number;
  code: string;
  name: string;
  createdAt: string;
}

export interface CreateTicketInput {
  code: string;
  name: string;
}

export async function createTicket(
  request: APIRequestContext,
  data: CreateTicketInput
): Promise<Ticket> {
  return apiPost<Ticket>(request, '/api/tickets', data);
}

export async function deleteTicket(
  request: APIRequestContext,
  id: number
): Promise<void> {
  return apiDelete(request, `/api/tickets/${id}`);
}

export interface Rental {
  id: number;
  code: string;
  name: string;
  variantId: number;
  createdAt: string;
}

export async function findRentalsByCode(
  request: APIRequestContext,
  query: string
): Promise<Rental[]> {
  return apiGet<Rental[]>(
    request,
    `/api/rentals?query=${encodeURIComponent(query)}`
  );
}

export async function deleteRental(
  request: APIRequestContext,
  id: number
): Promise<void> {
  return apiDelete(request, `/api/rentals/${id}`);
}

export interface CreateRentalCheckinInput {
  code: string;
  name: string;
  variantId: number;
  checkinAt: string;
}

export async function checkinRental(
  request: APIRequestContext,
  data: CreateRentalCheckinInput
): Promise<Rental> {
  const rentals = await apiPost<Rental[]>(request, '/api/rentals/checkin', [
    data,
  ]);
  return rentals[0];
}

export interface CreateBudgetInput {
  name: string;
  percentage: number;
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

export interface Material {
  id: number;
  name: string;
  purchaseUnit: string;
  isStockCheckRequired: boolean;
  createdAt: string;
}

export interface CreateMaterialInput {
  name: string;
  price: number;
  unit: string;
  purchaseUnit: string;
  purchaseUnitSize: number;
  minimumStock: number;
  normalStock: number;
  isStockCheckRequired: boolean;
}

export async function createMaterial(
  request: APIRequestContext,
  data: CreateMaterialInput
): Promise<Material> {
  return apiPost<Material>(request, '/api/materials', { ...data, suppliers: [] });
}

export async function deleteMaterial(
  request: APIRequestContext,
  id: number
): Promise<void> {
  return apiDelete(request, `/api/materials/${id}`);
}

export interface StockCheckItem {
  id: number;
  materialId: number;
  materialName: string;
  purchaseUnit: string;
  currentStock: number;
}

export interface StockCheck {
  id: number;
  createdAt: string;
  items: StockCheckItem[];
}

export interface CreateStockCheckInput {
  items: Array<{ materialId: number; currentStock: number }>;
}

export async function createStockCheck(
  request: APIRequestContext,
  data: CreateStockCheckInput
): Promise<StockCheck> {
  return apiPost<StockCheck>(request, '/api/stock-checks', data);
}

export async function getStockCheckById(
  request: APIRequestContext,
  id: number
): Promise<StockCheck> {
  return apiGet<StockCheck>(request, `/api/stock-checks/${id}`);
}

export async function deleteStockCheck(
  request: APIRequestContext,
  id: number
): Promise<void> {
  return apiDelete(request, `/api/stock-checks/${id}`);
}

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

export interface Table {
  id: number;
  code: string;
  label: string;
  createdAt: string;
}

export async function createTable(
  request: APIRequestContext,
  data: { label: string; floorNumber?: number }
): Promise<Table> {
  return apiPost<Table>(request, '/api/tables', { floorNumber: 1, ...data });
}

export async function deleteTable(
  request: APIRequestContext,
  id: number
): Promise<void> {
  return apiDelete(request, `/api/tables/${id}`);
}

export interface OrderPayment {
  partnerReferenceNo: string;
  transactionNumber: number;
  fulfillmentStatus: 'preparing' | 'ready';
}

export interface CheckoutOrderTransactionInput {
  tableCode: string;
  variantId: number;
  amount: number;
  customerName: string;
}

// The staff-authenticated /api/transactions endpoint always defaults source
// to 'pos' (TransactionRequest has no source field), so a fulfilment e2e
// spec needs a real source='order' row — created the same way a guest does,
// by driving the cart+checkout API directly with a throwaway session id.
export async function checkoutOrderTransaction(
  request: APIRequestContext,
  data: CheckoutOrderTransactionInput
): Promise<OrderPayment> {
  const headers = { 'X-Session-Id': randomUUID() };

  const cartTableResponse = await request.put('/api/carts/current', {
    data: { tableCode: data.tableCode },
    headers,
  });
  if (!cartTableResponse.ok()) {
    throw new Error(
      `PUT /api/carts/current failed: ${cartTableResponse.status()} ${await cartTableResponse.text()}`
    );
  }

  const cartItemResponse = await request.post('/api/carts/current/items', {
    data: { variantId: data.variantId, amount: data.amount },
    headers,
  });
  if (!cartItemResponse.ok()) {
    throw new Error(
      `POST /api/carts/current/items failed: ${cartItemResponse.status()} ${await cartItemResponse.text()}`
    );
  }

  const checkoutResponse = await request.post('/api/carts/current/checkout', {
    data: { customerName: data.customerName },
    headers,
  });
  if (!checkoutResponse.ok()) {
    throw new Error(
      `POST /api/carts/current/checkout failed: ${checkoutResponse.status()} ${await checkoutResponse.text()}`
    );
  }
  const { data: payment } = await checkoutResponse.json();
  return payment as OrderPayment;
}

export interface UpdateAvailabilityInput {
  products?: Array<{
    productId: number;
    isAvailable?: boolean;
    availableQuantity?: number;
  }>;
  variants?: Array<{
    variantId: number;
    isAvailable?: boolean;
    availableQuantity?: number;
  }>;
}

export async function updateAvailability(
  request: APIRequestContext,
  data: UpdateAvailabilityInput
): Promise<void> {
  await apiPut(request, '/api/availability', data);
}
