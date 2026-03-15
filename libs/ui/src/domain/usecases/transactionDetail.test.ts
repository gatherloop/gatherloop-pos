import {
  TransactionDetailUsecase,
  TransactionDetailState,
  TransactionDetailAction,
  TransactionDetailParams,
} from './transactionDetail';
import { MockTransactionRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('TransactionDetailUsecase', () => {
  describe('success flow - fetch', () => {
    const repository = new MockTransactionRepository();
    const usecase = new TransactionDetailUsecase(repository, { transactionId: 1, transaction: null });
    let tester: UsecaseTester<TransactionDetailUsecase, TransactionDetailState, TransactionDetailAction, TransactionDetailParams>;

    it('initializes in loading state when no data preloaded', () => {
      tester = new UsecaseTester(usecase);
      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - fetch error', () => {
    const repository = new MockTransactionRepository();
    repository.setShouldFail(true);
    const usecase = new TransactionDetailUsecase(repository, { transactionId: 1, transaction: null });
    let tester: UsecaseTester<TransactionDetailUsecase, TransactionDetailState, TransactionDetailAction, TransactionDetailParams>;

    it('initializes in loading state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('error');
    });

    it('transitions to loading when FETCH is dispatched from error', () => {
      repository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
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
