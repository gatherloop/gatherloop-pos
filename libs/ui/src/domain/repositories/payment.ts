import { Payment } from '../entities';

// Thrown by a PaymentRepository implementation when a reference does not
// resolve to any payment for this session — unknown, or belonging to
// another session (D18). Distinct from a transport/server error so
// OrderStatusUsecase can route to the "not found" screen instead of a
// retryable error.
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
