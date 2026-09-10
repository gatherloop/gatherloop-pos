import axios from 'axios';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  paymentCheckout,
  paymentFindByPartnerReferenceNo,
} from '../../../../api-contract/src';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { RequestConfig } from '../../../../api-contract/src/client';
import {
  PaymentNotFoundError,
  PaymentRepository,
} from '../../domain/repositories/payment';
import { SessionRepository } from '../../domain/repositories/session';
import { toPayment } from './payment.transformer';

export class ApiPaymentRepository implements PaymentRepository {
  constructor(private readonly sessionRepository: SessionRepository) {}

  private sessionRequestConfig(): Partial<RequestConfig> {
    return {
      headers: { 'X-Session-Id': this.sessionRepository.getSessionId() },
      withCredentials: false,
    };
  }

  checkout: PaymentRepository['checkout'] = (customerName) => {
    return paymentCheckout({ customerName }, this.sessionRequestConfig()).then(
      ({ data }) => toPayment(data)
    );
  };

  fetchPayment: PaymentRepository['fetchPayment'] = (reference) => {
    return paymentFindByPartnerReferenceNo(reference, this.sessionRequestConfig())
      .then(({ data }) => toPayment(data))
      .catch((error) => {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          throw new PaymentNotFoundError();
        }
        throw error;
      });
  };
}
