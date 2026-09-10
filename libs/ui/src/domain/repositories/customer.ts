import { RequestConfig } from '@kubb/swagger-client/client';

export interface CustomerRepository {
  fetchCurrentName: (options?: Partial<RequestConfig>) => Promise<string>;
}
