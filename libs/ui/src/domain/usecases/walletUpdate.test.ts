import {
  WalletUpdateUsecase,
  WalletUpdateState,
  WalletUpdateAction,
  WalletUpdateParams,
} from './walletUpdate';
import { MockWalletRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('WalletUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    const repository = new MockWalletRepository();
    const usecase = new WalletUpdateUsecase(repository, { walletId: 1, wallet: null });
    let tester: UsecaseTester<WalletUpdateUsecase, WalletUpdateState, WalletUpdateAction, WalletUpdateParams>;

    it('initializes in loading state when no data preloaded', () => {
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
        values: { name: 'Updated Wallet', balance: 500000, paymentCostPercentage: 0, isCashless: false },
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
    const usecase = new WalletUpdateUsecase(repository, { walletId: 1, wallet: null });
    let tester: UsecaseTester<WalletUpdateUsecase, WalletUpdateState, WalletUpdateAction, WalletUpdateParams>;

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
    const usecase = new WalletUpdateUsecase(repository, {
      walletId: 1,
      wallet: repository.wallets[0],
    });
    let tester: UsecaseTester<WalletUpdateUsecase, WalletUpdateState, WalletUpdateAction, WalletUpdateParams>;

    it('initializes in loaded state when data is preloaded', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Updated Wallet', balance: 500000, paymentCostPercentage: 0, isCashless: false },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });

  it('starts in loaded state when data is preloaded', () => {
    const repository = new MockWalletRepository();
    const existing = repository.wallets[0];
    const usecase = new WalletUpdateUsecase(repository, { walletId: 1, wallet: existing });
    const tester = new UsecaseTester<WalletUpdateUsecase, WalletUpdateState, WalletUpdateAction, WalletUpdateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
