import { RequestOptions } from './requestOptions';

export interface CustomerRepository {
  fetchCurrentName: (options?: RequestOptions) => Promise<string>;
}
