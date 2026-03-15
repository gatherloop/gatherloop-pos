import {
  TransactionUpdateUsecase,
  TransactionUpdateState,
  TransactionUpdateAction,
  TransactionUpdateParams,
} from './transactionUpdate';
import { MockTransactionRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('TransactionUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    const repository = new MockTransactionRepository();
    const usecase = new TransactionUpdateUsecase(repository, { transactionId: 1, transaction: null });
    let tester: UsecaseTester<TransactionUpdateUsecase, TransactionUpdateState, TransactionUpdateAction, TransactionUpdateParams>;

    it('initializes in loading state when no data preloaded', () => {
      tester = new UsecaseTester(usecase);
      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Updated Transaction', orderNumber: 1, transactionItems: [], transactionCoupons: [] },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful submit', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    const repository = new MockTransactionRepository();
    repository.setShouldFail(true);
    const usecase = new TransactionUpdateUsecase(repository, { transactionId: 1, transaction: null });
    let tester: UsecaseTester<TransactionUpdateUsecase, TransactionUpdateState, TransactionUpdateAction, TransactionUpdateParams>;

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

  describe('error flow - submit error', () => {
    const repository = new MockTransactionRepository();
    repository.setShouldFail(true);
    const usecase = new TransactionUpdateUsecase(repository, {
      transactionId: 1,
      transaction: repository.transactions[0],
    });
    let tester: UsecaseTester<TransactionUpdateUsecase, TransactionUpdateState, TransactionUpdateAction, TransactionUpdateParams>;

    it('initializes in loaded state when data is preloaded', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Updated Transaction', orderNumber: 1, transactionItems: [], transactionCoupons: [] },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });

  it('starts in loaded state when data is preloaded', () => {
    const repository = new MockTransactionRepository();
    const existing = repository.transactions[0];
    const usecase = new TransactionUpdateUsecase(repository, { transactionId: 1, transaction: existing });
    const tester = new UsecaseTester<TransactionUpdateUsecase, TransactionUpdateState, TransactionUpdateAction, TransactionUpdateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
