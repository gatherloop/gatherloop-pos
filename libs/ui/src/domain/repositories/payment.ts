import { Payment } from '../entities';
import { RequestOptions } from './requestOptions';

export interface PaymentRepository {
  checkout: (
    customerName: string,
    options?: RequestOptions
  ) => Promise<Payment>;

  fetchPayment: (
    reference: string,
    options?: RequestOptions
  ) => Promise<Payment>;
}
