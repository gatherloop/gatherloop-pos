import {
  WalletDetailUsecase,
  WalletDetailState,
  WalletDetailAction,
  WalletDetailParams,
} from './walletDetail';
import { MockWalletRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('WalletDetailUsecase', () => {
  describe('success flow - fetch', () => {
    const repository = new MockWalletRepository();
    const usecase = new WalletDetailUsecase(repository, { walletId: 1, wallet: null });
    let tester: UsecaseTester<WalletDetailUsecase, WalletDetailState, WalletDetailAction, WalletDetailParams>;

    it('initializes in loading state when no data preloaded', () => {
      tester = new UsecaseTester(usecase);
      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - fetch error', () => {
    const repository = new MockWalletRepository();
    repository.setShouldFail(true);
    const usecase = new WalletDetailUsecase(repository, { walletId: 1, wallet: null });
    let tester: UsecaseTester<WalletDetailUsecase, WalletDetailState, WalletDetailAction, WalletDetailParams>;

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

  it('starts in loaded state when data is preloaded', () => {
    const repository = new MockWalletRepository();
    const existing = repository.wallets[0];
    const usecase = new WalletDetailUsecase(repository, { walletId: 1, wallet: existing });
    const tester = new UsecaseTester<WalletDetailUsecase, WalletDetailState, WalletDetailAction, WalletDetailParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
