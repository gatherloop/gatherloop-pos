import { type Page } from '@playwright/test';

export const tableResolve = {
  tableLabel: (page: Page, label: string) =>
    page.getByText(label, { exact: true }),
  invalidQr: (page: Page) => page.getByText('QR tidak valid'),
  noQr: (page: Page) => page.getByText('Pindai QR di meja Anda'),
};

export const menuList = {
  searchInput: (page: Page) => page.getByPlaceholder('Cari menu'),
  categoryChip: (page: Page, name: string) =>
    page.getByRole('button', { name, exact: true }),
  productCard: (page: Page, name: string) =>
    page.getByRole('button', { name, exact: true }),
  startingPrice: (page: Page, formattedPrice: string) =>
    page.getByText(`mulai ${formattedPrice}`),
  emptyView: (page: Page) => page.getByText('Menu tidak ditemukan'),
};

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

export const cartBar = {
  viewCartButton: (page: Page) =>
    page.getByRole('button', { name: /Lihat Keranjang$/ }),
};

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

export const cartItemEdit = {
  saveButton: (page: Page) => page.getByRole('button', { name: 'Simpan' }),
};

export const checkout = {
  summaryTitle: (page: Page) => page.getByText('Ringkasan Pesanan'),
  payButton: (page: Page, formattedTotal: string) =>
    page.getByRole('button', { name: `Bayar dengan QRIS · ${formattedTotal}` }),
  backToCartButton: (page: Page) =>
    page.getByRole('button', { name: 'Kembali ke keranjang' }),

  nameInput: (page: Page) => page.getByLabel('Nama Anda'),
  submitNameButton: (page: Page) =>
    page.getByRole('button', { name: 'Lanjutkan ke pembayaran' }),
  cancelNameButton: (page: Page) => page.getByRole('button', { name: 'Batal' }),

  saveQrButton: (page: Page) => page.getByRole('button', { name: 'Simpan QR' }),
  waitingForPaymentText: (page: Page) => page.getByText('Menunggu pembayaran…'),

  paymentSuccessTitle: (page: Page) => page.getByText('Pembayaran berhasil'),

  expiredTitle: (page: Page) => page.getByText('Waktu pembayaran habis'),
  retryPaymentButton: (page: Page) =>
    page.getByRole('button', { name: 'Coba bayar lagi' }),

  disabledTitle: (page: Page) => page.getByText('Checkout belum tersedia'),
};

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
