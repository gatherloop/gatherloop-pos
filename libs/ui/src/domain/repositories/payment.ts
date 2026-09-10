import { Payment } from '../entities';
import { RequestConfig } from '@kubb/swagger-client/client';

export interface PaymentRepository {
  checkout: (
    customerName: string,
    options?: Partial<RequestConfig>
  ) => Promise<Payment>;

  fetchPayment: (
    reference: string,
    options?: Partial<RequestConfig>
  ) => Promise<Payment>;
}
