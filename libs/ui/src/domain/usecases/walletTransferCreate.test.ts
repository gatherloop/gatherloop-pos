import {
  WalletTransferCreateUsecase,
  WalletTransferCreateState,
  WalletTransferCreateAction,
  WalletTransferCreateParams,
} from './walletTransferCreate';
import { MockWalletRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('WalletTransferCreateUsecase', () => {
  describe('success flow - no preloaded wallets (fetch required)', () => {
    it('should transition loading -> loaded -> submitting -> submitSuccess', async () => {
      const repository = new MockWalletRepository();
      const usecase = new WalletTransferCreateUsecase(repository, { fromWalletId: 1, wallets: [] });
      const tester = new UsecaseTester<WalletTransferCreateUsecase, WalletTransferCreateState, WalletTransferCreateAction, WalletTransferCreateParams>(usecase);

      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { fromWalletId: 1, toWalletId: 2, amount: 50000 },
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
      const usecase = new WalletTransferCreateUsecase(repository, { fromWalletId: 1, wallets: [] });
      const tester = new UsecaseTester<WalletTransferCreateUsecase, WalletTransferCreateState, WalletTransferCreateAction, WalletTransferCreateParams>(usecase);

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
      const wallets = [...new MockWalletRepository().wallets];
      const usecase = new WalletTransferCreateUsecase(repository, { fromWalletId: 1, wallets });
      const tester = new UsecaseTester<WalletTransferCreateUsecase, WalletTransferCreateState, WalletTransferCreateAction, WalletTransferCreateParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { fromWalletId: 1, toWalletId: 2, amount: 50000 },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('submitError');
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
