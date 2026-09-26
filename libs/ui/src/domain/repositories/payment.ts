import {
  Payment,
  PaymentDiningOption,
  PaymentMethod,
  PaymentSummary,
} from '../entities';

export class PaymentNotFoundError extends Error {
  constructor() {
    super('Payment not found');
    this.name = 'PaymentNotFoundError';
  }
}

export type WhatsappNumberRejectionReason = 'invalid' | 'not_registered';

export class WhatsappNumberRejectedError extends Error {
  constructor(public readonly reason: WhatsappNumberRejectionReason) {
    super('WhatsApp number rejected');
    this.name = 'WhatsappNumberRejectedError';
  }
}

export interface PaymentRepository {
  checkout: (params: {
    customerName: string;
    method: PaymentMethod;
    whatsappNumber?: string;
    diningOption?: PaymentDiningOption;
  }) => Promise<Payment>;

  fetchPayment: (reference: string) => Promise<Payment>;

  fetchPayments: (params: {
    limit: number;
    skip: number;
  }) => Promise<{ payments: PaymentSummary[]; total: number }>;

  cancelPayment: (reference: string) => Promise<Payment>;
}
