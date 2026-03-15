import {
  WalletTransferCreateUsecase,
  WalletTransferCreateState,
  WalletTransferCreateAction,
  WalletTransferCreateParams,
} from './walletTransferCreate';
import { MockWalletRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('WalletTransferCreateUsecase', () => {
  describe('success flow - no preloaded wallets (fetch required)', () => {
    const repository = new MockWalletRepository();
    const usecase = new WalletTransferCreateUsecase(repository, { fromWalletId: 1, wallets: [] });
    let tester: UsecaseTester<WalletTransferCreateUsecase, WalletTransferCreateState, WalletTransferCreateAction, WalletTransferCreateParams>;

    it('initializes in loading state when no wallets preloaded', () => {
      tester = new UsecaseTester(usecase);
      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { fromWalletId: 1, toWalletId: 2, amount: 50000 },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful submit', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    const repository = new MockWalletRepository();
    repository.setShouldFail(true);
    const usecase = new WalletTransferCreateUsecase(repository, { fromWalletId: 1, wallets: [] });
    let tester: UsecaseTester<WalletTransferCreateUsecase, WalletTransferCreateState, WalletTransferCreateAction, WalletTransferCreateParams>;

    it('initializes in loading state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('error');
    });

    it('transitions to loading when FETCH is dispatched from error', () => {
      repository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - submit error', () => {
    const repository = new MockWalletRepository();
    repository.setShouldFail(true);
    const wallets = [...new MockWalletRepository().wallets];
    const usecase = new WalletTransferCreateUsecase(repository, { fromWalletId: 1, wallets });
    let tester: UsecaseTester<WalletTransferCreateUsecase, WalletTransferCreateState, WalletTransferCreateAction, WalletTransferCreateParams>;

    it('initializes in loaded state when wallets are preloaded', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { fromWalletId: 1, toWalletId: 2, amount: 50000 },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });

  it('starts in loaded state when wallets are preloaded', () => {
    const repository = new MockWalletRepository();
    const usecase = new WalletTransferCreateUsecase(repository, {
      fromWalletId: 1,
      wallets: repository.wallets,
    });
    const tester = new UsecaseTester<WalletTransferCreateUsecase, WalletTransferCreateState, WalletTransferCreateAction, WalletTransferCreateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
