import {
  OrderHistoryUsecase,
  OrderHistoryAction,
  OrderHistoryState,
  OrderHistoryParams,
} from './orderHistory';
import { MockPaymentRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

const createTester = (
  repository: MockPaymentRepository,
  params: OrderHistoryParams
) =>
  new UsecaseTester<
    OrderHistoryUsecase,
    OrderHistoryState,
    OrderHistoryAction,
    OrderHistoryParams
  >(new OrderHistoryUsecase(repository, params));

describe('OrderHistoryUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → revalidating → loaded', async () => {
      const repository = new MockPaymentRepository();
      const orderHistory = createTester(repository, { payments: [] });

      expect(orderHistory.state).toEqual({
        type: 'loading',
        payments: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(orderHistory.state).toEqual({
        type: 'loaded',
        payments: repository.payments,
        errorMessage: null,
      });

      orderHistory.dispatch({ type: 'FETCH' });
      expect(orderHistory.state).toEqual({
        type: 'revalidating',
        payments: repository.payments,
        errorMessage: null,
      });

      await flushPromises();
      expect(orderHistory.state).toEqual({
        type: 'loaded',
        payments: repository.payments,
        errorMessage: null,
      });
    });
  });

  describe('failed flow', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockPaymentRepository();
      repository.setShouldFailFetchPayments(true);
      const orderHistory = createTester(repository, { payments: [] });

      expect(orderHistory.state).toEqual({
        type: 'loading',
        payments: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(orderHistory.state).toEqual({
        type: 'error',
        payments: [],
        errorMessage: 'Failed to fetch orders',
      });

      repository.setShouldFailFetchPayments(false);
      orderHistory.dispatch({ type: 'FETCH' });
      expect(orderHistory.state).toEqual({
        type: 'loading',
        payments: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(orderHistory.state).toEqual({
        type: 'loaded',
        payments: repository.payments,
        errorMessage: null,
      });
    });

    it('keeps the current list when a revalidation fails', async () => {
      const repository = new MockPaymentRepository();
      const orderHistory = createTester(repository, { payments: [] });

      await flushPromises();
      expect(orderHistory.state).toEqual({
        type: 'loaded',
        payments: repository.payments,
        errorMessage: null,
      });

      repository.setShouldFailFetchPayments(true);
      orderHistory.dispatch({ type: 'FETCH' });
      expect(orderHistory.state).toEqual({
        type: 'revalidating',
        payments: repository.payments,
        errorMessage: null,
      });

      await flushPromises();
      expect(orderHistory.state).toEqual({
        type: 'loaded',
        payments: repository.payments,
        errorMessage: null,
      });
    });
  });

  it('shows loaded state when initial data is given', async () => {
    const repository = new MockPaymentRepository();
    const payments = [repository.payments[0]];

    const orderHistory = createTester(repository, { payments });

    expect(orderHistory.state).toEqual({
      type: 'loaded',
      payments,
      errorMessage: null,
    });
  });

  it('shows idle then empty loaded state when a session has no orders', async () => {
    const repository = new MockPaymentRepository();
    repository.payments = [];

    const orderHistory = createTester(repository, { payments: [] });

    expect(orderHistory.state).toEqual({
      type: 'loading',
      payments: [],
      errorMessage: null,
    });

    await flushPromises();
    expect(orderHistory.state).toEqual({
      type: 'loaded',
      payments: [],
      errorMessage: null,
    });
  });
});
