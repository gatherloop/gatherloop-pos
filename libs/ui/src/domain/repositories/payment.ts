import { Payment } from '../entities';

export interface PaymentRepository {
  checkout: (customerName: string) => Promise<Payment>;

  fetchPayment: (reference: string) => Promise<Payment>;
}
