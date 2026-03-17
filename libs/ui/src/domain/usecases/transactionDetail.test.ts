import {
  TransactionDetailUsecase,
  TransactionDetailState,
  TransactionDetailAction,
  TransactionDetailParams,
} from './transactionDetail';
import { MockTransactionRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TransactionDetailUsecase', () => {
  describe('success flow - fetch', () => {
    it('should transition loading → loaded', async () => {
      const repository = new MockTransactionRepository();
      const usecase = new TransactionDetailUsecase(repository, { transactionId: 1, transaction: null });
      const tester = new UsecaseTester<TransactionDetailUsecase, TransactionDetailState, TransactionDetailAction, TransactionDetailParams>(usecase);

      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockTransactionRepository();
      repository.setShouldFail(true);
      const usecase = new TransactionDetailUsecase(repository, { transactionId: 1, transaction: null });
      const tester = new UsecaseTester<TransactionDetailUsecase, TransactionDetailState, TransactionDetailAction, TransactionDetailParams>(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('error');

      repository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });

  it('starts in loaded state when data is preloaded', () => {
    const repository = new MockTransactionRepository();
    const existing = repository.transactions[0];
    const usecase = new TransactionDetailUsecase(repository, { transactionId: 1, transaction: existing });
    const tester = new UsecaseTester<TransactionDetailUsecase, TransactionDetailState, TransactionDetailAction, TransactionDetailParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
