// eslint-disable-next-line @nx/enforce-module-boundaries
import { customerGetCurrent } from '../../../../api-contract/src';
import { RequestConfig } from '@kubb/swagger-client/client';
import { CustomerRepository } from '../../domain/repositories/customer';
import { SessionRepository } from '../../domain/repositories/session';

// D24/FR-4 in docs/prd-order-checkout-qris-doku.md. Follows
// `ApiCartRepository` exactly: the session id is a constructor dependency
// and travels with every call as `X-Session-Id`, `withCredentials: false`.
export class ApiCustomerRepository implements CustomerRepository {
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

  fetchCurrentName: CustomerRepository['fetchCurrentName'] = (options) => {
    return customerGetCurrent(this.withSessionOptions(options)).then(
      ({ data }) => data.name
    );
  };
}
