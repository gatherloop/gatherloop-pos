import { Payment } from '../entities';
import { RequestConfig } from '@kubb/swagger-client/client';

// FR-6/FR-8 in docs/prd-order-checkout-qris-doku.md. Both methods resolve to
// a full `Payment` (the checkout response carries everything the QR and
// status screens need), mirroring `CartRepository`. The session id travels
// as `X-Session-Id`, attached per call by the implementation, never as a
// parameter here.
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
