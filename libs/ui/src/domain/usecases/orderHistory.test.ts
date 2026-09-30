import {
  OrderHistoryUsecase,
  OrderHistoryAction,
  OrderHistoryState,
  OrderHistoryParams,
} from './orderHistory';
import { MockPaymentRepository, MockSessionRepository } from '../../data/mock';
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
        tableCode: null,
      });

      await flushPromises();
      expect(orderHistory.state).toEqual({
        type: 'loaded',
        payments: repository.payments,
        errorMessage: null,
        tableCode: null,
      });

      orderHistory.dispatch({ type: 'FETCH' });
      expect(orderHistory.state).toEqual({
        type: 'revalidating',
        payments: repository.payments,
        errorMessage: null,
        tableCode: null,
      });

      await flushPromises();
      expect(orderHistory.state).toEqual({
        type: 'loaded',
        payments: repository.payments,
        errorMessage: null,
        tableCode: null,
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
        tableCode: null,
      });

      await flushPromises();
      expect(orderHistory.state).toEqual({
        type: 'error',
        payments: [],
        errorMessage: 'Failed to fetch orders',
        tableCode: null,
      });

      repository.setShouldFailFetchPayments(false);
      orderHistory.dispatch({ type: 'FETCH' });
      expect(orderHistory.state).toEqual({
        type: 'loading',
        payments: [],
        errorMessage: null,
        tableCode: null,
      });

      await flushPromises();
      expect(orderHistory.state).toEqual({
        type: 'loaded',
        payments: repository.payments,
        errorMessage: null,
        tableCode: null,
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
        tableCode: null,
      });

      repository.setShouldFailFetchPayments(true);
      orderHistory.dispatch({ type: 'FETCH' });
      expect(orderHistory.state).toEqual({
        type: 'revalidating',
        payments: repository.payments,
        errorMessage: null,
        tableCode: null,
      });

      await flushPromises();
      expect(orderHistory.state).toEqual({
        type: 'loaded',
        payments: repository.payments,
        errorMessage: null,
        tableCode: null,
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
      tableCode: null,
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
      tableCode: null,
    });

    await flushPromises();
    expect(orderHistory.state).toEqual({
      type: 'loaded',
      payments: [],
      errorMessage: null,
      tableCode: null,
    });
  });

  describe('tableCode', () => {
    it('reads the table code from the injected session repository', () => {
      const repository = new MockPaymentRepository();
      const sessionRepository = new MockSessionRepository();
      sessionRepository.setTableCode('3F7H9K2M5P');

      const usecase = new OrderHistoryUsecase(
        repository,
        { payments: [] },
        { sessionRepository }
      );

      expect(usecase.getInitialState().tableCode).toBe('3F7H9K2M5P');
    });

    it('is null when no session repository dependency is provided', () => {
      const repository = new MockPaymentRepository();

      const usecase = new OrderHistoryUsecase(repository, { payments: [] });

      expect(usecase.getInitialState().tableCode).toBeNull();
    });
  });
});
