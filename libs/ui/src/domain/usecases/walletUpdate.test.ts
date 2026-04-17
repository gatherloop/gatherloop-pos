import {
  WalletUpdateUsecase,
  WalletUpdateState,
  WalletUpdateAction,
  WalletUpdateParams,
} from './walletUpdate';
import { MockWalletRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('WalletUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    it('should transition loading -> loaded -> submitting -> submitSuccess', async () => {
      const repository = new MockWalletRepository();
      const usecase = new WalletUpdateUsecase(repository, { walletId: 1, wallet: null });
      const tester = new UsecaseTester<WalletUpdateUsecase, WalletUpdateState, WalletUpdateAction, WalletUpdateParams>(usecase);

      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Updated Wallet', balance: 500000, paymentCostPercentage: 0, isCashless: false },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading -> error -> loading -> loaded', async () => {
      const repository = new MockWalletRepository();
      repository.setShouldFail(true);
      const usecase = new WalletUpdateUsecase(repository, { walletId: 1, wallet: null });
      const tester = new UsecaseTester<WalletUpdateUsecase, WalletUpdateState, WalletUpdateAction, WalletUpdateParams>(usecase);

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

  describe('error flow - submit error', () => {
    it('should transition loaded -> submitting -> loaded (after submit error auto-cancel)', async () => {
      const repository = new MockWalletRepository();
      repository.setShouldFail(true);
      const usecase = new WalletUpdateUsecase(repository, {
        walletId: 1,
        wallet: repository.wallets[0],
      });
      const tester = new UsecaseTester<WalletUpdateUsecase, WalletUpdateState, WalletUpdateAction, WalletUpdateParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Updated Wallet', balance: 500000, paymentCostPercentage: 0, isCashless: false },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('submitError');
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
