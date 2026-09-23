import { type Page } from '@playwright/test';

export const DEFAULT_E2E_WHATSAPP_NUMBER = '081234567890';

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
  soldOutBadge: (page: Page, name: string) =>
    menuList.productCard(page, name).getByText('Habis', { exact: true }),
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
  remainingQuantityHint: (page: Page, remaining: number) =>
    page.getByText(`Sisa ${remaining}`, { exact: true }),
  addToCartButton: (page: Page) =>
    page.getByRole('button', { name: /^Tambah ke Keranjang/ }),
  soldOutAddToCartButton: (page: Page) =>
    page.getByRole('button', { name: 'Stok habis' }),
  closeButton: (page: Page) => page.getByLabel('Tutup'),
};

export const cartBar = {
  // CartBar.tsx renders "Lihat Keranjang · {n} item" — matched by prefix, like addToCartButton below.
  viewCartButton: (page: Page) =>
    page.getByRole('button', { name: /^Lihat Keranjang/ }),
};

export const cartScreen = {
  emptyView: (page: Page) => page.getByText('Keranjang kosong'),
  lineItemName: (page: Page, productName: string) =>
    page.getByText(productName, { exact: true }),
  lineItemSoldOutBadge: (page: Page, productName: string) =>
    cartScreen
      .lineItemName(page, productName)
      .locator('xpath=..')
      .getByText('Habis', { exact: true }),
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
  checkoutButton: (page: Page, formattedTotal: string) =>
    page.getByRole('button', {
      name: `Bayar dengan QRIS · ${formattedTotal}`,
    }),
  checkoutDisabledText: (page: Page) =>
    page.getByText('Checkout belum tersedia'),
  total: (page: Page, formattedTotal: string) =>
    page.getByText(formattedTotal, { exact: true }),

  nameInput: (page: Page) => page.getByLabel('Nama Anda'),
  whatsappNumberInput: (page: Page) => page.getByLabel('Nomor WhatsApp'),
  fillCustomerDetails: async (
    page: Page,
    name: string,
    whatsappNumber: string = DEFAULT_E2E_WHATSAPP_NUMBER
  ) => {
    await cartScreen.nameInput(page).fill(name);
    await cartScreen.whatsappNumberInput(page).fill(whatsappNumber);
  },
  submitNameButton: (page: Page) =>
    page.getByRole('button', { name: 'Lanjutkan ke pembayaran' }),
  cancelNameButton: (page: Page) => page.getByRole('button', { name: 'Batal' }),

  cashMethodButton: (page: Page) =>
    page.getByLabel('Bayar dengan Cash di Kasir'),
  submitCashButton: (page: Page) =>
    page.getByRole('button', { name: 'Pesan & bayar di kasir' }),
};

export const cartItemEdit = {
  saveButton: (page: Page) => page.getByRole('button', { name: 'Simpan' }),
};

export const orderStatus = {
  preparingTitle: (page: Page) => page.getByText(/^Sedang disiapkan/),
  tableLabel: (page: Page, label: string) =>
    page.getByText(label, { exact: true }).last(),
  transactionNumberBadge: (page: Page, transactionNumber: number) =>
    page.getByText(`#${transactionNumber}`, { exact: true }),
  readyTitle: (page: Page) => page.getByText('Pesanan siap!'),
  pickupInstructionText: (page: Page, transactionNumber: number) =>
    page.getByText(
      `Silakan ambil di kasir dengan menyebutkan nomor #${transactionNumber}.`
    ),
  orderAgainButton: (page: Page) =>
    page.getByRole('button', { name: 'Pesan lagi' }),
  notFoundView: (page: Page) => page.getByText('Pesanan tidak ditemukan'),

  saveQrButton: (page: Page) => page.getByRole('button', { name: 'Simpan QR' }),
  waitingForPaymentText: (page: Page) => page.getByText('Menunggu pembayaran…'),

  cashHeading: (page: Page, cashierLocation: string) =>
    page.getByText(`Bayar di kasir ${cashierLocation}`),
  waitingForCashPaymentText: (page: Page) =>
    page.getByText('Menunggu pembayaran di kasir…'),

  expiredTitle: (page: Page) => page.getByText('Waktu pembayaran habis'),
  cashExpiredSubtitle: (page: Page) =>
    page.getByText(
      'Pesanan dibatalkan karena belum dibayar. Keranjang Anda masih tersimpan.'
    ),
  backToCartButton: (page: Page) =>
    page.getByRole('button', { name: 'Kembali ke keranjang' }),
  itemLine: (page: Page, amount: number, productName: string) =>
    page.getByText(`${amount}x ${productName}`, { exact: true }),
};

export const orderBrandHeader = {
  historyButton: (page: Page) =>
    page.getByRole('button', { name: 'Pesanan Saya' }),
};

export const orderHistory = {
  heading: (page: Page) => page.getByText('Pesanan Saya'),
  row: (page: Page, transactionNumber: number) =>
    page.getByRole('button', { name: `Pesanan #${transactionNumber}` }),
  emptyView: (page: Page) => page.getByText('Belum ada pesanan'),
};
