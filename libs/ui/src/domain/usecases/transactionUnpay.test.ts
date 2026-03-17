import {
  TransactionUnpayUsecase,
  TransactionUnpayState,
  TransactionUnpayAction,
} from './transactionUnpay';
import { MockTransactionRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TransactionUnpayUsecase', () => {
  describe('success flow', () => {
    it('should transition hidden → shown → unpaying → hidden', async () => {
      const repository = new MockTransactionRepository();
      const usecase = new TransactionUnpayUsecase(repository);
      const tester = new UsecaseTester<TransactionUnpayUsecase, TransactionUnpayState, TransactionUnpayAction, undefined>(usecase);

      expect(tester.state).toEqual({ type: 'hidden', transactionId: null });

      tester.dispatch({ type: 'SHOW_CONFIRMATION', transactionId: 1 });
      expect(tester.state).toEqual({ type: 'shown', transactionId: 1 });

      tester.dispatch({ type: 'UNPAY' });
      expect(tester.state.type).toBe('unpaying');

      await flushPromises();
      // unpayingSuccess -> onStateChange dispatches HIDE_CONFIRMATION -> hidden
      expect(tester.state.type).toBe('hidden');
    });
  });

  it('transitions to hidden when HIDE_CONFIRMATION is dispatched from shown', () => {
    const repository = new MockTransactionRepository();
    const usecase = new TransactionUnpayUsecase(repository);
    const tester = new UsecaseTester<TransactionUnpayUsecase, TransactionUnpayState, TransactionUnpayAction, undefined>(usecase);
    tester.dispatch({ type: 'SHOW_CONFIRMATION', transactionId: 1 });
    tester.dispatch({ type: 'HIDE_CONFIRMATION' });
    expect(tester.state.type).toBe('hidden');
  });

  describe('error flow', () => {
    it('should transition hidden → shown → unpaying → shown (auto-recover from unpayingError)', async () => {
      const repository = new MockTransactionRepository();
      repository.setShouldFail(true);
      const usecase = new TransactionUnpayUsecase(repository);
      const tester = new UsecaseTester<TransactionUnpayUsecase, TransactionUnpayState, TransactionUnpayAction, undefined>(usecase);

      expect(tester.state.type).toBe('hidden');

      tester.dispatch({ type: 'SHOW_CONFIRMATION', transactionId: 1 });
      expect(tester.state.type).toBe('shown');

      tester.dispatch({ type: 'UNPAY' });
      expect(tester.state.type).toBe('unpaying');

      await flushPromises();
      // unpaying -> unpayingError -> onStateChange(unpayingError) -> UNPAY_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
