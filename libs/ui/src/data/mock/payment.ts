import { Payment, PaymentSummary } from '../../domain/entities';
import {
  PaymentNotFoundError,
  PaymentRepository,
} from '../../domain/repositories/payment';

const initialPaymentSummaries = (): PaymentSummary[] => [
  {
    reference: 'ORD0000000000002',
    status: 'paid',
    method: 'qris',
    fulfillmentStatus: 'preparing',
    transactionNumber: 2,
    customerName: 'Andi',
    tableLabel: 'Meja 3',
    amount: 45000,
    itemCount: 3,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    paidAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
  {
    reference: 'ORD0000000000001',
    status: 'paid',
    method: 'qris',
    fulfillmentStatus: 'ready',
    transactionNumber: 1,
    customerName: 'Andi',
    tableLabel: 'Meja 3',
    amount: 18000,
    itemCount: 1,
    createdAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    paidAt: new Date(Date.now() - 64 * 60 * 1000).toISOString(),
  },
];

const initialPayment = (): Payment => ({
  reference: 'ORD0000000000001',
  status: 'pending',
  method: 'qris',
  amount: 18000,
  qrContent: 'mock-qr-content',
  expiredAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  paidAt: null,
  customerName: '',
  tableLabel: 'A1',
  transactionNumber: 1,
  fulfillmentStatus: 'preparing',
  canCancel: true,
  cancelReason: null,
  items: [
    {
      name: 'Es Kopi Susu - Regular',
      amount: 1,
      price: 18000,
      subtotal: 18000,
      note: '',
      options: [{ name: 'Ukuran', value: 'Regular' }],
    },
  ],
});

const cashPayment = (): Payment => ({
  ...initialPayment(),
  reference: 'ORD0000000000003',
  method: 'cash',
  qrContent: '',
  expiredAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  transactionNumber: 3,
});

export class MockPaymentRepository implements PaymentRepository {
  payment: Payment = initialPayment();
  payments: PaymentSummary[] = initialPaymentSummaries();

  private shouldFailCheckout = false;
  private shouldFailFetch = false;
  private shouldFailFetchPayments = false;
  private shouldFailCancel = false;

  setShouldFailCheckout(value: boolean) {
    this.shouldFailCheckout = value;
  }

  setShouldFailFetch(value: boolean) {
    this.shouldFailFetch = value;
  }

  setShouldFailFetchPayments(value: boolean) {
    this.shouldFailFetchPayments = value;
  }

  setShouldFailCancel(value: boolean) {
    this.shouldFailCancel = value;
  }

  checkout: PaymentRepository['checkout'] = async ({
    customerName,
    method,
  }) => {
    if (this.shouldFailCheckout) throw new Error('Failed to create payment');
    this.payment = {
      ...(method === 'cash' ? cashPayment() : initialPayment()),
      customerName,
    };
    return { ...this.payment };
  };

  fetchPayment: PaymentRepository['fetchPayment'] = async (reference) => {
    if (this.shouldFailFetch) throw new Error('Failed to fetch payment');
    if (reference !== this.payment.reference) throw new PaymentNotFoundError();
    return { ...this.payment };
  };

  fetchPayments: PaymentRepository['fetchPayments'] = async ({
    limit,
    skip,
  }) => {
    if (this.shouldFailFetchPayments) throw new Error('Failed to fetch orders');
    return {
      payments: this.payments.slice(skip, skip + limit),
      total: this.payments.length,
    };
  };

  cancelPayment: PaymentRepository['cancelPayment'] = async (reference) => {
    if (this.shouldFailCancel) throw new Error('Failed to cancel payment');
    if (reference !== this.payment.reference) throw new PaymentNotFoundError();
    if (this.payment.status === 'pending') {
      this.payment = {
        ...this.payment,
        status: 'cancelled',
        cancelReason: 'guest',
        canCancel: false,
      };
    }
    return { ...this.payment };
  };

  reset() {
    this.payment = initialPayment();
    this.payments = initialPaymentSummaries();
    this.shouldFailCheckout = false;
    this.shouldFailFetch = false;
    this.shouldFailFetchPayments = false;
    this.shouldFailCancel = false;
  }
}
