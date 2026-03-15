import {
  TransactionUnpayUsecase,
  TransactionUnpayState,
  TransactionUnpayAction,
} from './transactionUnpay';
import { MockTransactionRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('TransactionUnpayUsecase', () => {
  describe('success flow', () => {
    const repository = new MockTransactionRepository();
    const usecase = new TransactionUnpayUsecase(repository);
    let tester: UsecaseTester<TransactionUnpayUsecase, TransactionUnpayState, TransactionUnpayAction, undefined>;

    it('initializes in hidden state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state).toEqual({ type: 'hidden', transactionId: null });
    });

    it('transitions to shown when SHOW_CONFIRMATION is dispatched', () => {
      tester.dispatch({ type: 'SHOW_CONFIRMATION', transactionId: 1 });
      expect(tester.state).toEqual({ type: 'shown', transactionId: 1 });
    });

    it('transitions to unpaying when UNPAY is dispatched', () => {
      tester.dispatch({ type: 'UNPAY' });
      expect(tester.state.type).toBe('unpaying');
    });

    it('auto-transitions to hidden after successful unpay', async () => {
      await Promise.resolve();
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
    const repository = new MockTransactionRepository();
    repository.setShouldFail(true);
    const usecase = new TransactionUnpayUsecase(repository);
    let tester: UsecaseTester<TransactionUnpayUsecase, TransactionUnpayState, TransactionUnpayAction, undefined>;

    it('initializes in hidden state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('hidden');
    });

    it('transitions to shown when SHOW_CONFIRMATION is dispatched', () => {
      tester.dispatch({ type: 'SHOW_CONFIRMATION', transactionId: 1 });
      expect(tester.state.type).toBe('shown');
    });

    it('transitions to unpaying when UNPAY is dispatched', () => {
      tester.dispatch({ type: 'UNPAY' });
      expect(tester.state.type).toBe('unpaying');
    });

    it('auto-recovers to shown state after unpay error', async () => {
      await Promise.resolve();
      // unpaying -> unpayingError -> onStateChange(unpayingError) -> UNPAY_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
