import { Payment, PaymentMethod, PaymentSummary } from '../entities';

export class PaymentNotFoundError extends Error {
  constructor() {
    super('Payment not found');
    this.name = 'PaymentNotFoundError';
  }
}

export interface PaymentRepository {
  checkout: (params: {
    customerName: string;
    method: PaymentMethod;
    whatsappNumber?: string;
  }) => Promise<Payment>;

  fetchPayment: (reference: string) => Promise<Payment>;

  fetchPayments: (params: {
    limit: number;
    skip: number;
  }) => Promise<{ payments: PaymentSummary[]; total: number }>;

  cancelPayment: (reference: string) => Promise<Payment>;
}
