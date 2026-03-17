import {
  TransactionDeleteUsecase,
  TransactionDeleteState,
  TransactionDeleteAction,
} from './transactionDelete';
import { MockTransactionRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TransactionDeleteUsecase', () => {
  describe('success flow', () => {
    it('should transition hidden → shown → deleting → hidden', async () => {
      const repository = new MockTransactionRepository();
      const usecase = new TransactionDeleteUsecase(repository);
      const tester = new UsecaseTester<TransactionDeleteUsecase, TransactionDeleteState, TransactionDeleteAction, undefined>(usecase);

      expect(tester.state).toEqual({ type: 'hidden', transactionId: null });

      tester.dispatch({ type: 'SHOW_CONFIRMATION', transactionId: 1 });
      expect(tester.state).toEqual({ type: 'shown', transactionId: 1 });

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deletingSuccess -> onStateChange dispatches HIDE_CONFIRMATION -> hidden
      expect(tester.state.type).toBe('hidden');
    });
  });

  it('transitions to hidden when HIDE_CONFIRMATION is dispatched from shown', () => {
    const repository = new MockTransactionRepository();
    const usecase = new TransactionDeleteUsecase(repository);
    const tester = new UsecaseTester<TransactionDeleteUsecase, TransactionDeleteState, TransactionDeleteAction, undefined>(usecase);
    tester.dispatch({ type: 'SHOW_CONFIRMATION', transactionId: 1 });
    tester.dispatch({ type: 'HIDE_CONFIRMATION' });
    expect(tester.state.type).toBe('hidden');
  });

  describe('error flow', () => {
    it('should transition hidden → shown → deleting → shown (auto-recover from deletingError)', async () => {
      const repository = new MockTransactionRepository();
      repository.setShouldFail(true);
      const usecase = new TransactionDeleteUsecase(repository);
      const tester = new UsecaseTester<TransactionDeleteUsecase, TransactionDeleteState, TransactionDeleteAction, undefined>(usecase);

      expect(tester.state.type).toBe('hidden');

      tester.dispatch({ type: 'SHOW_CONFIRMATION', transactionId: 1 });
      expect(tester.state.type).toBe('shown');

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deleting -> deletingError -> onStateChange(deletingError) -> DELETE_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
