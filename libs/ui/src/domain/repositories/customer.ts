import { Customer } from '../entities';

export interface CustomerRepository {
  fetchCurrentCustomer: () => Promise<Customer>;
}
