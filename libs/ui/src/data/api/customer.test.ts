import { SessionRepository } from '../../domain/repositories/session';
import { ApiCustomerRepository } from './customer';

const customerGetCurrent = jest.fn().mockResolvedValue({
  data: { name: 'Andi', whatsappNumber: '6281234567890' },
});

// eslint-disable-next-line @nx/enforce-module-boundaries
jest.mock('../../../../api-contract/src', () => ({
  customerGetCurrent: (...args: unknown[]) => customerGetCurrent(...args),
}));

const mockSessionRepository: SessionRepository = {
  getSessionId: () => 'session-1',
  getTableCode: () => null,
  setTableCode: () => undefined,
};

describe('ApiCustomerRepository', () => {
  beforeEach(() => {
    customerGetCurrent.mockClear();
  });

  it('fetches the current customer with the session header', async () => {
    const repository = new ApiCustomerRepository(mockSessionRepository);

    const customer = await repository.fetchCurrentCustomer();

    expect(customer).toEqual({ name: 'Andi', whatsappNumber: '6281234567890' });
    expect(customerGetCurrent).toHaveBeenCalledWith({
      headers: { 'X-Session-Id': 'session-1' },
      withCredentials: false,
    });
  });
});
