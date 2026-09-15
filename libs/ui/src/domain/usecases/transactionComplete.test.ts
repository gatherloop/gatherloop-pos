import {
  TransactionCompleteUsecase,
  TransactionCompleteState,
  TransactionCompleteAction,
} from './transactionComplete';
import { MockTransactionRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TransactionCompleteUsecase', () => {
  describe('complete flow', () => {
    it('should transition hidden → shown → completing → hidden', async () => {
      const repository = new MockTransactionRepository();
      const usecase = new TransactionCompleteUsecase(repository);
      const tester = new UsecaseTester<
        TransactionCompleteUsecase,
        TransactionCompleteState,
        TransactionCompleteAction,
        undefined
      >(usecase);

      expect(tester.state).toEqual({
        type: 'hidden',
        transactionId: null,
        action: null,
      });

      tester.dispatch({
        type: 'SHOW_CONFIRMATION',
        transactionId: 2,
        action: 'complete',
      });
      expect(tester.state).toEqual({
        type: 'shown',
        transactionId: 2,
        action: 'complete',
      });

      tester.dispatch({ type: 'COMPLETE' });
      expect(tester.state.type).toBe('completing');

      await flushPromises();
      expect(tester.state.type).toBe('hidden');

      const transaction = await repository.fetchTransactionById(2);
      expect(transaction.completedAt).not.toBeNull();
    });
  });

  describe('uncomplete flow', () => {
    it('should transition hidden → shown → completing → hidden', async () => {
      const repository = new MockTransactionRepository();
      await repository.completeTransaction(2);
      const usecase = new TransactionCompleteUsecase(repository);
      const tester = new UsecaseTester<
        TransactionCompleteUsecase,
        TransactionCompleteState,
        TransactionCompleteAction,
        undefined
      >(usecase);

      tester.dispatch({
        type: 'SHOW_CONFIRMATION',
        transactionId: 2,
        action: 'uncomplete',
      });
      expect(tester.state).toEqual({
        type: 'shown',
        transactionId: 2,
        action: 'uncomplete',
      });

      tester.dispatch({ type: 'COMPLETE' });
      expect(tester.state.type).toBe('completing');

      await flushPromises();
      expect(tester.state.type).toBe('hidden');

      const transaction = await repository.fetchTransactionById(2);
      expect(transaction.completedAt).toBeNull();
    });
  });

  it('transitions to hidden when HIDE_CONFIRMATION is dispatched from shown', () => {
    const repository = new MockTransactionRepository();
    const usecase = new TransactionCompleteUsecase(repository);
    const tester = new UsecaseTester<
      TransactionCompleteUsecase,
      TransactionCompleteState,
      TransactionCompleteAction,
      undefined
    >(usecase);
    tester.dispatch({
      type: 'SHOW_CONFIRMATION',
      transactionId: 2,
      action: 'complete',
    });
    tester.dispatch({ type: 'HIDE_CONFIRMATION' });
    expect(tester.state.type).toBe('hidden');
  });

  describe('error flow', () => {
    it('should transition hidden → shown → completing → shown (auto-recover from completingError)', async () => {
      const repository = new MockTransactionRepository();
      repository.setShouldFail(true);
      const usecase = new TransactionCompleteUsecase(repository);
      const tester = new UsecaseTester<
        TransactionCompleteUsecase,
        TransactionCompleteState,
        TransactionCompleteAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('hidden');

      tester.dispatch({
        type: 'SHOW_CONFIRMATION',
        transactionId: 2,
        action: 'complete',
      });
      expect(tester.state.type).toBe('shown');

      tester.dispatch({ type: 'COMPLETE' });
      expect(tester.state.type).toBe('completing');

      await flushPromises();
      expect(tester.state.type).toBe('shown');
    });
  });
});
