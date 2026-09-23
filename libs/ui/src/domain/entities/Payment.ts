import { TransactionFulfillmentStatus } from './Transaction';

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

export type PaymentMethod = 'qris' | 'cash';

export type Payment = {
  reference: string;
  status: QrisPaymentStatus;
  method: PaymentMethod;
  amount: number;
  qrContent: string;
  expiredAt: string;
  paidAt: string | null;
  customerName: string;
  tableLabel: string;
  items: PaymentItem[];
  transactionNumber: number;
  fulfillmentStatus: TransactionFulfillmentStatus;
};

export type PaymentSummary = {
  reference: string;
  status: QrisPaymentStatus;
  method: PaymentMethod;
  fulfillmentStatus: TransactionFulfillmentStatus;
  transactionNumber: number;
  customerName: string;
  tableLabel: string;
  amount: number;
  itemCount: number;
  createdAt: string;
  paidAt: string | null;
};
