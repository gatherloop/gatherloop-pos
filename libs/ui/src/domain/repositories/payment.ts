import { Payment } from '../entities';

// Distinct from a transport error so OrderStatusUsecase routes to notFound.
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
