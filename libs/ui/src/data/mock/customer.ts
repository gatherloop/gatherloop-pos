import { CustomerRepository } from '../../domain/repositories/customer';

export class MockCustomerRepository implements CustomerRepository {
  name = '';

  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  fetchCurrentName: CustomerRepository['fetchCurrentName'] = async () => {
    if (this.shouldFail) throw new Error('Failed to fetch customer name');
    return this.name;
  };

  reset() {
    this.name = '';
    this.shouldFail = false;
  }
}
