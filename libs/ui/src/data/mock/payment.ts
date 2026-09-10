import { Payment } from '../../domain/entities';
import {
  PaymentNotFoundError,
  PaymentRepository,
} from '../../domain/repositories/payment';

const initialPayment = (): Payment => ({
  reference: 'ORD0000000000001',
  status: 'pending',
  amount: 18000,
  qrContent: 'mock-qr-content',
  expiredAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  paidAt: null,
  customerName: '',
  tableLabel: 'A1',
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

export class MockPaymentRepository implements PaymentRepository {
  payment: Payment = initialPayment();

  private shouldFailCheckout = false;
  private shouldFailFetch = false;

  setShouldFailCheckout(value: boolean) {
    this.shouldFailCheckout = value;
  }

  setShouldFailFetch(value: boolean) {
    this.shouldFailFetch = value;
  }

  checkout: PaymentRepository['checkout'] = async (customerName) => {
    if (this.shouldFailCheckout) throw new Error('Failed to create payment');
    this.payment = { ...this.payment, customerName };
    return { ...this.payment };
  };

  fetchPayment: PaymentRepository['fetchPayment'] = async (reference) => {
    if (this.shouldFailFetch) throw new Error('Failed to fetch payment');
    if (reference !== this.payment.reference) throw new PaymentNotFoundError();
    return { ...this.payment };
  };

  reset() {
    this.payment = initialPayment();
    this.shouldFailCheckout = false;
    this.shouldFailFetch = false;
  }
}
