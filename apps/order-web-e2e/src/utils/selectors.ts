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

// PendingPaymentBar.tsx (menu footer) and PendingPaymentNotice.tsx (item sheet,
// cart, cart-item edit) — the locked-cart surfaces from
// docs/prd-order-payment-cancellation.md D18/D21.
export const pendingPayment = {
  bar: (page: Page, methodLabel: 'QRIS' | 'tunai') =>
    page.getByText(`Menunggu pembayaran ${methodLabel}`),
  noticeText: (page: Page) =>
    page.getByText(
      'Anda masih punya pembayaran yang belum selesai. Selesaikan atau batalkan dulu untuk mengubah pesanan.'
    ),
  // Shared label across the bar and every notice — only ever one instance
  // visible per screen except while the cancel dialog (which reuses the same
  // copy for its own dismiss button) is open; scope to paymentCancelDialog
  // for that button instead of this one.
  continueButton: (page: Page) =>
    page.getByRole('button', { name: 'Lanjutkan pembayaran' }),
  cancelAndAddButton: (page: Page) =>
    page.getByRole('button', { name: 'Batalkan & tambah item' }),
  cancelButton: (page: Page) =>
    page.getByRole('button', { name: 'Batalkan pembayaran' }),
};

// PaymentCancelAlert.tsx, built on the base ConfirmationAlert — shared by the
// status page, the menu's item sheet and the cart (D20). Scoped to the
// `alertdialog` role so its "Lanjutkan pembayaran" button never collides with
// PendingPaymentBar's / PendingPaymentNotice's own button of the same name.
export const paymentCancelDialog = {
  container: (page: Page) => page.getByRole('alertdialog'),
  title: (page: Page) => page.getByText('Batalkan pembayaran?'),
  confirmButton: (page: Page) =>
    paymentCancelDialog.container(page).getByRole('button', { name: 'Ya, batalkan' }),
  dismissButton: (page: Page) =>
    paymentCancelDialog
      .container(page)
      .getByRole('button', { name: 'Lanjutkan pembayaran' }),
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
  // CartLineItem.tsx's own inline AmountStepper — saves immediately, no
  // separate edit sheet needed. Only unambiguous with a single cart line.
  increaseAmountButton: (page: Page) => page.getByLabel('Tambah jumlah'),

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
  readyTitle: (page: Page) => page.getByText('Pesanan siap', { exact: true }),
  pickupInstructionText: (page: Page, transactionNumber: number) =>
    page.getByText(
      `Silakan ambil di kasir dengan menyebutkan nomor #${transactionNumber}`
    ),
  orderAgainButton: (page: Page) =>
    page.getByRole('button', { name: 'Pesan lagi' }),
  notFoundView: (page: Page) => page.getByText('Pesanan tidak ditemukan'),

  // QrisPaymentView.tsx renamed this button's copy from "Simpan QR" to
  // "Download QR" (#549); the selector name is kept, matching its purpose.
  saveQrButton: (page: Page) => page.getByRole('button', { name: 'Download QR' }),
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

  // The awaiting variants' cancel button (OrderStatusScreen.tsx's
  // CancelPaymentSection) — opens paymentCancelDialog above.
  cancelPaymentButton: (page: Page) =>
    page.getByRole('button', { name: 'Batalkan pembayaran' }),
  cancelledTitle: (page: Page) => page.getByText('Pembayaran dibatalkan'),
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
  // OrderHistoryListItem.tsx's pendingPaymentLabelByMethod (D19).
  pendingQrisLabel: (page: Page) => page.getByText('Menunggu pembayaran QRIS'),
};
