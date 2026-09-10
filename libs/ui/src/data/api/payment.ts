// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  paymentCheckout,
  paymentFindByPartnerReferenceNo,
} from '../../../../api-contract/src';
import { RequestConfig } from '@kubb/swagger-client/client';
import { PaymentRepository } from '../../domain/repositories/payment';
import { SessionRepository } from '../../domain/repositories/session';
import { toPayment } from './payment.transformer';

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
