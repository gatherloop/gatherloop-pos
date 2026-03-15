import {
  TransactionPayUsecase,
  TransactionPayState,
  TransactionPayAction,
  TransactionPayParams,
} from './transactionPay';
import { MockTransactionRepository, MockWalletRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('TransactionPayUsecase', () => {
  describe('success flow', () => {
    const transactionRepository = new MockTransactionRepository();
    const walletRepository = new MockWalletRepository();
    const usecase = new TransactionPayUsecase(transactionRepository, walletRepository, {
      wallets: walletRepository.wallets,
    });
    let tester: UsecaseTester<TransactionPayUsecase, TransactionPayState, TransactionPayAction, TransactionPayParams>;

    it('initializes in hidden state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('hidden');
    });

    it('transitions to shown when SHOW_CONFIRMATION is dispatched', () => {
      tester.dispatch({ type: 'SHOW_CONFIRMATION', transactionId: 1, transactionTotal: 100000 });
      expect(tester.state.type).toBe('shown');
    });

    it('transitions to paying when PAY is dispatched', () => {
      tester.dispatch({ type: 'PAY', walletId: 1, paidAmount: 100000 });
      expect(tester.state.type).toBe('paying');
    });

    it('auto-transitions to hidden after successful pay', async () => {
      await Promise.resolve();
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
    const transactionRepository = new MockTransactionRepository();
    const walletRepository = new MockWalletRepository();
    const usecase = new TransactionPayUsecase(transactionRepository, walletRepository, { wallets: [] });
    let tester: UsecaseTester<TransactionPayUsecase, TransactionPayState, TransactionPayAction, TransactionPayParams>;

    it('initializes in hidden state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('hidden');
    });

    it('transitions to shown when SHOW_CONFIRMATION is dispatched', () => {
      tester.dispatch({ type: 'SHOW_CONFIRMATION', transactionId: 1, transactionTotal: 100000 });
      expect(tester.state.type).toBe('shown');
    });

    it('fetches wallets automatically when shown with empty wallets', async () => {
      await Promise.resolve();
      // onStateChange(shown) with wallets=[] fetches wallets and dispatches SET_WALLETS
      expect(tester.state.type).toBe('shown');
      expect((tester.state as { type: 'shown'; wallets: unknown[] }).wallets.length).toBeGreaterThan(0);
    });
  });

  describe('error flow', () => {
    const transactionRepository = new MockTransactionRepository();
    transactionRepository.setShouldFail(true);
    const walletRepository = new MockWalletRepository();
    const usecase = new TransactionPayUsecase(transactionRepository, walletRepository, {
      wallets: walletRepository.wallets,
    });
    let tester: UsecaseTester<TransactionPayUsecase, TransactionPayState, TransactionPayAction, TransactionPayParams>;

    it('initializes in hidden state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('hidden');
    });

    it('transitions to shown when SHOW_CONFIRMATION is dispatched', () => {
      tester.dispatch({ type: 'SHOW_CONFIRMATION', transactionId: 1, transactionTotal: 100000 });
      expect(tester.state.type).toBe('shown');
    });

    it('transitions to paying when PAY is dispatched', () => {
      tester.dispatch({ type: 'PAY', walletId: 1, paidAmount: 100000 });
      expect(tester.state.type).toBe('paying');
    });

    it('auto-recovers to shown state after pay error', async () => {
      await Promise.resolve();
      // paying -> payingError -> onStateChange(payingError) -> PAY_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
