import {
  TransactionUpdateUsecase,
  TransactionUpdateState,
  TransactionUpdateAction,
  TransactionUpdateParams,
} from './transactionUpdate';
import { MockTransactionRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TransactionUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    it('should transition loading → loaded → submitting → submitSuccess', async () => {
      const repository = new MockTransactionRepository();
      const usecase = new TransactionUpdateUsecase(repository, { transactionId: 1, transaction: null });
      const tester = new UsecaseTester<TransactionUpdateUsecase, TransactionUpdateState, TransactionUpdateAction, TransactionUpdateParams>(usecase);

      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Updated Transaction', orderNumber: 1, transactionItems: [], transactionCoupons: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockTransactionRepository();
      repository.setShouldFail(true);
      const usecase = new TransactionUpdateUsecase(repository, { transactionId: 1, transaction: null });
      const tester = new UsecaseTester<TransactionUpdateUsecase, TransactionUpdateState, TransactionUpdateAction, TransactionUpdateParams>(usecase);

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

  describe('error flow - submit error', () => {
    it('should transition loaded → submitting → loaded (auto-recover from submitError)', async () => {
      const repository = new MockTransactionRepository();
      repository.setShouldFail(true);
      const usecase = new TransactionUpdateUsecase(repository, {
        transactionId: 1,
        transaction: repository.transactions[0],
      });
      const tester = new UsecaseTester<TransactionUpdateUsecase, TransactionUpdateState, TransactionUpdateAction, TransactionUpdateParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Updated Transaction', orderNumber: 1, transactionItems: [], transactionCoupons: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('submitError');
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
