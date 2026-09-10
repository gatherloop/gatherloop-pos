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
