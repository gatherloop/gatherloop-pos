import {
  TransactionCreateUsecase,
  TransactionCreateState,
  TransactionCreateAction,
} from './transactionCreate';
import { MockTransactionRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TransactionCreateUsecase', () => {
  describe('success flow', () => {
    it('should transition loaded → submitting → submitSuccess', async () => {
      const repository = new MockTransactionRepository();
      const usecase = new TransactionCreateUsecase(repository);
      const tester = new UsecaseTester<TransactionCreateUsecase, TransactionCreateState, TransactionCreateAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Transaction 1', orderNumber: 1, transactionItems: [], transactionCoupons: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    it('should transition loaded → submitting → loaded (auto-recover from submitError)', async () => {
      const repository = new MockTransactionRepository();
      repository.setShouldFail(true);
      const usecase = new TransactionCreateUsecase(repository);
      const tester = new UsecaseTester<TransactionCreateUsecase, TransactionCreateState, TransactionCreateAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Transaction 1', orderNumber: 1, transactionItems: [], transactionCoupons: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });
});
