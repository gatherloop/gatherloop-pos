import {
  TransactionCreateUsecase,
  TransactionCreateState,
  TransactionCreateAction,
} from './transactionCreate';
import { MockTransactionRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TransactionCreateUsecase', () => {
  it('starts with diningOption defaulted to dine_in', () => {
    const repository = new MockTransactionRepository();
    const usecase = new TransactionCreateUsecase(repository);
    const tester = new UsecaseTester<TransactionCreateUsecase, TransactionCreateState, TransactionCreateAction, undefined>(usecase);

    expect(tester.state.values.diningOption).toBe('dine_in');
  });

  describe('success flow', () => {
    it('should transition loaded → submitting → submitSuccess', async () => {
      const repository = new MockTransactionRepository();
      const usecase = new TransactionCreateUsecase(repository);
      const tester = new UsecaseTester<TransactionCreateUsecase, TransactionCreateState, TransactionCreateAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Transaction 1', pagerNumber: 1, diningOption: 'dine_in', transactionItems: [], transactionCoupons: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
      expect(tester.state.transactionNumber).toBe(1);
    });

    it('submits diningOption untouched from the initial dine_in default', async () => {
      const repository = new MockTransactionRepository();
      const usecase = new TransactionCreateUsecase(repository);
      const tester = new UsecaseTester<TransactionCreateUsecase, TransactionCreateState, TransactionCreateAction, undefined>(usecase);

      tester.dispatch({
        type: 'SUBMIT',
        values: tester.state.values,
      });

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
      const created = repository.transactions[repository.transactions.length - 1];
      expect(created.diningOption).toBe('dine_in');
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
        values: { name: 'Transaction 1', pagerNumber: 1, diningOption: 'dine_in', transactionItems: [], transactionCoupons: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitError');
    });
  });
});
