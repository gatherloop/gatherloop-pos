/**
 * Shared locator helpers organized by feature area, mirroring the pattern in
 * apps/pos-web-e2e/src/utils/selectors.ts. Copy and accessible names below come
 * straight from the screens in libs/ui/src/presentation/views/screens/*.tsx and
 * libs/ui/src/presentation/views/components/{menu,cart}/*.tsx — all Bahasa
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
// Item detail sheet (MenuItemDetailScreen.tsx, /t/{code}?product={id})
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
// Cart line edit modal (CartItemEditScreen.tsx, /t/{code}/cart?item={id})
// ---------------------------------------------------------------------------

export const cartItemEdit = {
  saveButton: (page: Page) => page.getByRole('button', { name: 'Simpan' }),
};

// ---------------------------------------------------------------------------
// Checkout (CheckoutScreen.tsx + its checkout/* components,
// /t/{code}/checkout) — FR-9/UX steps 2-8 in
// docs/prd-order-checkout-qris-doku.md
// ---------------------------------------------------------------------------

export const checkout = {
  summaryTitle: (page: Page) => page.getByText('Ringkasan Pesanan'),
  payButton: (page: Page, formattedTotal: string) =>
    page.getByRole('button', { name: `Bayar dengan QRIS · ${formattedTotal}` }),
  backToCartButton: (page: Page) =>
    page.getByRole('button', { name: 'Kembali ke keranjang' }),

  // Name sheet (CustomerNameSheet.tsx, D17)
  nameInput: (page: Page) => page.getByLabel('Nama Anda'),
  submitNameButton: (page: Page) =>
    page.getByRole('button', { name: 'Lanjutkan ke pembayaran' }),
  cancelNameButton: (page: Page) => page.getByRole('button', { name: 'Batal' }),

  // QR view (QrisPaymentView.tsx, D23)
  saveQrButton: (page: Page) => page.getByRole('button', { name: 'Simpan QR' }),
  waitingForPaymentText: (page: Page) => page.getByText('Menunggu pembayaran…'),

  // Success view (PaymentSuccessView.tsx)
  paymentSuccessTitle: (page: Page) => page.getByText('Pembayaran berhasil'),

  // Expired state (inline in CheckoutScreen.tsx)
  expiredTitle: (page: Page) => page.getByText('Waktu pembayaran habis'),
  retryPaymentButton: (page: Page) =>
    page.getByRole('button', { name: 'Coba bayar lagi' }),

  disabledTitle: (page: Page) => page.getByText('Checkout belum tersedia'),
};

// ---------------------------------------------------------------------------
// Order status screen (OrderStatusScreen.tsx, /t/{code}/status?ref={reference})
// ---------------------------------------------------------------------------

export const orderStatus = {
  preparingTitle: (page: Page) =>
    page.getByText('Pesanan Anda sedang disiapkan'),
  tableLabel: (page: Page, label: string) =>
    page.getByText(label, { exact: true }).last(),
  customerName: (page: Page, name: string) =>
    page.getByText(`Atas nama ${name}`),
  orderAgainButton: (page: Page) =>
    page.getByRole('button', { name: 'Pesan lagi' }),
  notFoundView: (page: Page) => page.getByText('Pesanan tidak ditemukan'),
};
