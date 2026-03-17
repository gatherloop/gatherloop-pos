import {
  TransactionPayUsecase,
  TransactionPayState,
  TransactionPayAction,
  TransactionPayParams,
} from './transactionPay';
import { MockTransactionRepository, MockWalletRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TransactionPayUsecase', () => {
  describe('success flow', () => {
    it('should transition hidden → shown → paying → hidden', async () => {
      const transactionRepository = new MockTransactionRepository();
      const walletRepository = new MockWalletRepository();
      const usecase = new TransactionPayUsecase(transactionRepository, walletRepository, {
        wallets: walletRepository.wallets,
      });
      const tester = new UsecaseTester<TransactionPayUsecase, TransactionPayState, TransactionPayAction, TransactionPayParams>(usecase);

      expect(tester.state.type).toBe('hidden');

      tester.dispatch({ type: 'SHOW_CONFIRMATION', transactionId: 1, transactionTotal: 100000 });
      expect(tester.state.type).toBe('shown');

      tester.dispatch({ type: 'PAY', walletId: 1, paidAmount: 100000 });
      expect(tester.state.type).toBe('paying');

      await flushPromises();
      // payingSuccess -> onStateChange dispatches HIDE_CONFIRMATION -> hidden
      expect(tester.state.type).toBe('hidden');
    });
  });

  it('transitions to hidden when HIDE_CONFIRMATION is dispatched from shown', () => {
    const transactionRepository = new MockTransactionRepository();
    const walletRepository = new MockWalletRepository();
    const usecase = new TransactionPayUsecase(transactionRepository, walletRepository, {
      wallets: walletRepository.wallets,
    });
    const tester = new UsecaseTester<TransactionPayUsecase, TransactionPayState, TransactionPayAction, TransactionPayParams>(usecase);
    tester.dispatch({ type: 'SHOW_CONFIRMATION', transactionId: 1, transactionTotal: 100000 });
    tester.dispatch({ type: 'HIDE_CONFIRMATION' });
    expect(tester.state.type).toBe('hidden');
  });

  describe('success flow - fetches wallets when shown with empty wallets', () => {
    it('should transition hidden → shown and fetch wallets automatically', async () => {
      const transactionRepository = new MockTransactionRepository();
      const walletRepository = new MockWalletRepository();
      const usecase = new TransactionPayUsecase(transactionRepository, walletRepository, { wallets: [] });
      const tester = new UsecaseTester<TransactionPayUsecase, TransactionPayState, TransactionPayAction, TransactionPayParams>(usecase);

      expect(tester.state.type).toBe('hidden');

      tester.dispatch({ type: 'SHOW_CONFIRMATION', transactionId: 1, transactionTotal: 100000 });
      expect(tester.state.type).toBe('shown');

      await flushPromises();
      // onStateChange(shown) with wallets=[] fetches wallets and dispatches SET_WALLETS
      expect(tester.state.type).toBe('shown');
      expect((tester.state as { type: 'shown'; wallets: unknown[] }).wallets.length).toBeGreaterThan(0);
    });
  });

  describe('error flow', () => {
    it('should transition hidden → shown → paying → shown (auto-recover from payingError)', async () => {
      const transactionRepository = new MockTransactionRepository();
      transactionRepository.setShouldFail(true);
      const walletRepository = new MockWalletRepository();
      const usecase = new TransactionPayUsecase(transactionRepository, walletRepository, {
        wallets: walletRepository.wallets,
      });
      const tester = new UsecaseTester<TransactionPayUsecase, TransactionPayState, TransactionPayAction, TransactionPayParams>(usecase);

      expect(tester.state.type).toBe('hidden');

      tester.dispatch({ type: 'SHOW_CONFIRMATION', transactionId: 1, transactionTotal: 100000 });
      expect(tester.state.type).toBe('shown');

      tester.dispatch({ type: 'PAY', walletId: 1, paidAmount: 100000 });
      expect(tester.state.type).toBe('paying');

      await flushPromises();
      // paying -> payingError -> onStateChange(payingError) -> PAY_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
