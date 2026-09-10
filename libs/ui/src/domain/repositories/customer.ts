import { RequestConfig } from '@kubb/swagger-client/client';

// D24/FR-4 in docs/prd-order-checkout-qris-doku.md. Just the name prefill
// for the checkout name sheet — the name itself is written as part of
// checkout (FR-6), so this port has no write method.
export interface CustomerRepository {
  fetchCurrentName: (options?: Partial<RequestConfig>) => Promise<string>;
}
