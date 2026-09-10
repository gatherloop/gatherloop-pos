// eslint-disable-next-line @nx/enforce-module-boundaries
import { customerGetCurrent } from '../../../../api-contract/src';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { RequestConfig } from '../../../../api-contract/src/client';
import { CustomerRepository } from '../../domain/repositories/customer';
import { RequestOptions } from '../../domain/repositories/requestOptions';
import { SessionRepository } from '../../domain/repositories/session';

export class ApiCustomerRepository implements CustomerRepository {
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

  fetchCurrentName: CustomerRepository['fetchCurrentName'] = (options) => {
    return customerGetCurrent(this.withSessionOptions(options)).then(
      ({ data }) => data.name
    );
  };
}
