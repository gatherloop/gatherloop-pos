import { Payment } from '../entities';

export class PaymentNotFoundError extends Error {
  constructor() {
    super('Payment not found');
    this.name = 'PaymentNotFoundError';
  }
}

export interface PaymentRepository {
  checkout: (customerName: string) => Promise<Payment>;

  fetchPayment: (reference: string) => Promise<Payment>;
}
