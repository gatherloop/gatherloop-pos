// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  paymentCheckout,
  paymentFindByPartnerReferenceNo,
} from '../../../../api-contract/src';
import { RequestConfig } from '@kubb/swagger-client/client';
// Deep import, not the `domain` barrel (D20): that barrel also re-exports
// every POS usecase, which drags unrelated weight into the order bundle.
import { PaymentRepository } from '../../domain/repositories/payment';
import { SessionRepository } from '../../domain/repositories/session';
import { toPayment } from './payment.transformer';

// FR-6/FR-8 in docs/prd-order-checkout-qris-doku.md. Follows
// `ApiCartRepository` exactly: the session id is a constructor dependency
// and travels with every call as `X-Session-Id`, `withCredentials: false`.
export class ApiPaymentRepository implements PaymentRepository {
  constructor(private readonly sessionRepository: SessionRepository) {}

  private withSessionOptions(options?: Partial<RequestConfig>) {
    return {
      ...options,
      withCredentials: false,
      headers: {
        ...options?.headers,
        'X-Session-Id': this.sessionRepository.getSessionId(),
      },
    };
  }

  checkout: PaymentRepository['checkout'] = (customerName, options) => {
    return paymentCheckout(
      { customerName },
      this.withSessionOptions(options)
    ).then(({ data }) => toPayment(data));
  };

  fetchPayment: PaymentRepository['fetchPayment'] = (reference, options) => {
    return paymentFindByPartnerReferenceNo(
      reference,
      this.withSessionOptions(options)
    ).then(({ data }) => toPayment(data));
  };
}
