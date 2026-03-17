import {
  WalletDetailUsecase,
  WalletDetailState,
  WalletDetailAction,
  WalletDetailParams,
} from './walletDetail';
import { MockWalletRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('WalletDetailUsecase', () => {
  describe('success flow - fetch', () => {
    it('should transition loading -> loaded', async () => {
      const repository = new MockWalletRepository();
      const usecase = new WalletDetailUsecase(repository, { walletId: 1, wallet: null });
      const tester = new UsecaseTester<WalletDetailUsecase, WalletDetailState, WalletDetailAction, WalletDetailParams>(usecase);

      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading -> error -> loading -> loaded', async () => {
      const repository = new MockWalletRepository();
      repository.setShouldFail(true);
      const usecase = new WalletDetailUsecase(repository, { walletId: 1, wallet: null });
      const tester = new UsecaseTester<WalletDetailUsecase, WalletDetailState, WalletDetailAction, WalletDetailParams>(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('error');

      repository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');

      await flushPromises();
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
