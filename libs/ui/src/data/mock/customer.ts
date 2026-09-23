import { Customer } from '../../domain/entities';
import { CustomerRepository } from '../../domain/repositories/customer';

export class MockCustomerRepository implements CustomerRepository {
  customer: Customer = { name: '', whatsappNumber: '' };

  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  fetchCurrentCustomer: CustomerRepository['fetchCurrentCustomer'] =
    async () => {
      if (this.shouldFail) throw new Error('Failed to fetch customer');
      return { ...this.customer };
    };

  reset() {
    this.customer = { name: '', whatsappNumber: '' };
    this.shouldFail = false;
  }
}
