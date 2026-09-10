import { APIRequestContext, request as playwrightRequest } from '@playwright/test';

const API_BASE_URL = process.env['API_BASE_URL'] || 'http://127.0.0.1:8080';
const E2E_USERNAME = process.env['E2E_USERNAME'] ?? 'mnindrazaka';
const E2E_PASSWORD = process.env['E2E_PASSWORD'] ?? '((mnindrazaka))';

let contextPromise: Promise<APIRequestContext> | null = null;

async function getContext(): Promise<APIRequestContext> {
  if (!contextPromise) {
    contextPromise = (async () => {
      const anonymous = await playwrightRequest.newContext({
        baseURL: API_BASE_URL,
      });
      const response = await anonymous.post('/auth/login', {
        data: { username: E2E_USERNAME, password: E2E_PASSWORD },
      });
      if (!response.ok()) {
        throw new Error(
          `POST /auth/login failed: ${response.status()} ${await response.text()}`
        );
      }
      const { data: token } = (await response.json()) as { data: string };
      await anonymous.dispose();

      return playwrightRequest.newContext({
        baseURL: API_BASE_URL,
        extraHTTPHeaders: { Authorization: `Bearer ${token}` },
      });
    })();
  }
  return contextPromise;
}

export async function disposeApiContext(): Promise<void> {
  if (!contextPromise) return;
  const context = await contextPromise;
  contextPromise = null;
  await context.dispose();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const context = await getContext();
  const response = await context.post(path, { data: body });
  if (!response.ok()) {
    throw new Error(
      `POST ${path} failed: ${response.status()} ${await response.text()}`
    );
  }
  const json = await response.json();
  return json.data as T;
}

async function apiDelete(path: string): Promise<void> {
  const context = await getContext();
  const response = await context.delete(path);
  if (!response.ok()) {
    throw new Error(
      `DELETE ${path} failed: ${response.status()} ${await response.text()}`
    );
  }
}

export interface Category {
  id: number;
  name: string;
  station: 'KITCHEN' | 'BAR' | 'NONE';
  createdAt: string;
}

export async function createCategory(data: {
  name: string;
  station: 'KITCHEN' | 'BAR' | 'NONE';
}): Promise<Category> {
  return apiPost<Category>('/categories', data);
}

export async function deleteCategory(id: number): Promise<void> {
  return apiDelete(`/categories/${id}`);
}

export interface OptionValue {
  id: number;
  name: string;
}

export interface Option {
  id: number;
  name: string;
  values: OptionValue[];
}

export interface Product {
  id: number;
  categoryId: number;
  name: string;
  description?: string;
  imageUrl: string;
  options: Option[];
  saleType: 'purchase' | 'rental';
  status: 'draft' | 'published';
  createdAt: string;
}

export interface CreateProductInput {
  categoryId: number;
  name: string;
  description?: string;
  imageUrl: string;
  saleType: 'purchase' | 'rental';
  status: 'draft' | 'published';
  options: Array<{ name: string; values: Array<{ name: string }> }>;
}

export async function createProduct(data: CreateProductInput): Promise<Product> {
  return apiPost<Product>('/products', data);
}

export async function deleteProduct(id: number): Promise<void> {
  return apiDelete(`/products/${id}`);
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
  materials: Array<{ materialId: number; amount: number }>;
  values: Array<{ optionValueId: number }>;
}

export async function createVariant(data: CreateVariantInput): Promise<Variant> {
  return apiPost<Variant>('/variants', data);
}

export async function deleteVariant(id: number): Promise<void> {
  return apiDelete(`/variants/${id}`);
}

export interface Table {
  id: number;
  code: string;
  label: string;
  createdAt: string;
}

export async function createTable(data: { label: string }): Promise<Table> {
  return apiPost<Table>('/tables', data);
}

export async function deleteTable(id: number): Promise<void> {
  return apiDelete(`/tables/${id}`);
}
