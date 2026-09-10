// eslint-disable-next-line @nx/enforce-module-boundaries
import { customerGetCurrent } from '../../../../api-contract/src';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { RequestConfig } from '../../../../api-contract/src/client';
import { CustomerRepository } from '../../domain/repositories/customer';
import { SessionRepository } from '../../domain/repositories/session';

export class ApiCustomerRepository implements CustomerRepository {
  constructor(private readonly sessionRepository: SessionRepository) {}

  private sessionRequestConfig(): Partial<RequestConfig> {
    return {
      headers: { 'X-Session-Id': this.sessionRepository.getSessionId() },
      withCredentials: false,
    };
  }

  fetchCurrentName: CustomerRepository['fetchCurrentName'] = () => {
    return customerGetCurrent(this.sessionRequestConfig()).then(
      ({ data }) => data.name
    );
  };
}
