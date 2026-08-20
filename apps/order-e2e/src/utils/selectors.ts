/**
 * Shared locator helpers organized by feature area, mirroring the pattern in
 * apps/web-e2e/src/utils/selectors.ts. Copy and accessible names below come
 * straight from the screens in libs/ui/src/presentation/screens/*.tsx and
 * libs/ui/src/presentation/components/{menu,cart}/*.tsx — all Bahasa
 * Indonesia per D15 in docs/prd-table-ordering.md.
 *
 * Convention:
 *   import * as sel from './utils/selectors';
 *   await sel.menuList.searchInput(page).fill('kopi');
 */

import { type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Table resolve shell (TableResolveScreen.tsx)
// ---------------------------------------------------------------------------

export const tableResolve = {
  tableLabel: (page: Page, label: string) =>
    page.getByText(label, { exact: true }),
  invalidQr: (page: Page) => page.getByText('QR tidak valid'),
  noQr: (page: Page) => page.getByText('Pindai QR di meja Anda'),
};

// ---------------------------------------------------------------------------
// Menu list screen (MenuListScreen.tsx, /t/{code})
// ---------------------------------------------------------------------------

export const menuList = {
  searchInput: (page: Page) => page.getByPlaceholder('Cari menu'),
  /** Category chip, including the always-present "Semua" (all) chip. */
  categoryChip: (page: Page, name: string) =>
    page.getByRole('button', { name, exact: true }),
  /** A product card — the whole card carries `accessibilityRole="button"`
   * with the product name as its label, but the product name text node is
   * itself inside it and click-through works the same either way. */
  productCard: (page: Page, name: string) =>
    page.getByRole('button', { name, exact: true }),
  startingPrice: (page: Page, formattedPrice: string) =>
    page.getByText(`mulai ${formattedPrice}`),
  emptyView: (page: Page) => page.getByText('Menu tidak ditemukan'),
};

// ---------------------------------------------------------------------------
// Item detail sheet (MenuItemDetailScreen.tsx, /t/{code}/products/{id})
// ---------------------------------------------------------------------------

export const itemDetail = {
  optionValueChip: (page: Page, name: string) =>
    page.getByRole('button', { name, exact: true }),
  noteInput: (page: Page) =>
    page.getByPlaceholder('Contoh: less sugar, tanpa es'),
  increaseAmountButton: (page: Page) => page.getByLabel('Tambah jumlah'),
  decreaseAmountButton: (page: Page) => page.getByLabel('Kurangi jumlah'),
  addToCartButton: (page: Page) =>
    page.getByRole('button', { name: /^Tambah ke Keranjang/ }),
  closeButton: (page: Page) => page.getByLabel('Tutup'),
};

// ---------------------------------------------------------------------------
// Floating cart bar (CartBar.tsx, rendered on menu/detail routes)
// ---------------------------------------------------------------------------

export const cartBar = {
  viewCartButton: (page: Page) =>
    page.getByRole('button', { name: /Lihat Keranjang$/ }),
};

// ---------------------------------------------------------------------------
// Cart screen (CartScreen.tsx / CartLineItem.tsx, /t/{code}/cart)
// ---------------------------------------------------------------------------

export const cartScreen = {
  emptyView: (page: Page) => page.getByText('Keranjang kosong'),
  lineItemName: (page: Page, productName: string) =>
    page.getByText(productName, { exact: true }),
  lineItemNote: (page: Page, note: string) =>
    page.getByText(`Catatan: ${note}`),
  editButton: (page: Page, productName: string) =>
    page.getByLabel(`Ubah ${productName}`),
  removeButton: (page: Page, productName: string) =>
    page.getByLabel(`Hapus ${productName} dari keranjang`),
  addMoreItemsButton: (page: Page) =>
    page.getByRole('button', { name: 'Tambah menu lainnya' }),
  clearCartButton: (page: Page) =>
    page.getByRole('button', { name: 'Kosongkan keranjang' }),
  checkoutButton: (page: Page) =>
    page.getByRole('button', { name: /^Checkout/ }),
  total: (page: Page, formattedTotal: string) =>
    page.getByText(formattedTotal, { exact: true }),
};

// ---------------------------------------------------------------------------
// Cart line edit modal (CartItemEditScreen.tsx, /t/{code}/cart/items/{id})
// ---------------------------------------------------------------------------

export const cartItemEdit = {
  saveButton: (page: Page) => page.getByRole('button', { name: 'Simpan' }),
};

// ---------------------------------------------------------------------------
// Checkout stub (CheckoutScreen.tsx, /t/{code}/checkout)
// ---------------------------------------------------------------------------

export const checkout = {
  qrisTitle: (page: Page) =>
    page.getByText('Pembayaran QRIS — segera hadir'),
  backToCartButton: (page: Page) =>
    page.getByRole('button', { name: 'Kembali ke keranjang' }),
};
