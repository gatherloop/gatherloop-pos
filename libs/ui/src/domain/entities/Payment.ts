// FR-6/FR-8 in docs/prd-order-checkout-qris-doku.md. `reference` renames the
// API's `partnerReferenceNo` — the only id the order app ever holds for a
// payment (D18) — so the frontend slice never repeats that long name.
export type PaymentItemOption = {
  name: string;
  value: string;
};

export type PaymentItem = {
  name: string;
  amount: number;
  price: number;
  subtotal: number;
  note: string;
  options: PaymentItemOption[];
};

// Named `Qris...`, not `PaymentStatus` — `Transaction.ts` already exports
// that name for the unrelated paid/unpaid/all POS filter.
export type QrisPaymentStatus = 'pending' | 'paid' | 'expired' | 'failed';

export type Payment = {
  reference: string;
  status: QrisPaymentStatus;
  amount: number;
  qrContent: string;
  expiredAt: string;
  paidAt: string | null;
  customerName: string;
  tableLabel: string;
  items: PaymentItem[];
};
