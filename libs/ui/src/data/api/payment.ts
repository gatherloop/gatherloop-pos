// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  paymentCheckout,
  paymentFindByPartnerReferenceNo,
} from '../../../../api-contract/src';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { RequestConfig } from '../../../../api-contract/src/client';
import { PaymentRepository } from '../../domain/repositories/payment';
import { RequestOptions } from '../../domain/repositories/requestOptions';
import { SessionRepository } from '../../domain/repositories/session';
import { toPayment } from './payment.transformer';

export class ApiPaymentRepository implements PaymentRepository {
  constructor(private readonly sessionRepository: SessionRepository) {}

  private withSessionOptions(options?: RequestOptions): Partial<RequestConfig> {
    return {
      headers: {
        ...options?.headers,
        'X-Session-Id': this.sessionRepository.getSessionId(),
      },
      withCredentials: false,
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
