import {
  TransactionCreateUsecase,
  TransactionCreateState,
  TransactionCreateAction,
} from './transactionCreate';
import { MockTransactionRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('TransactionCreateUsecase', () => {
  describe('success flow', () => {
    const repository = new MockTransactionRepository();
    const usecase = new TransactionCreateUsecase(repository);
    let tester: UsecaseTester<TransactionCreateUsecase, TransactionCreateState, TransactionCreateAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Transaction 1', orderNumber: 1, transactionItems: [], transactionCoupons: [] },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful create', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    const repository = new MockTransactionRepository();
    repository.setShouldFail(true);
    const usecase = new TransactionCreateUsecase(repository);
    let tester: UsecaseTester<TransactionCreateUsecase, TransactionCreateState, TransactionCreateAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Transaction 1', orderNumber: 1, transactionItems: [], transactionCoupons: [] },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });
});
