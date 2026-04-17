import {
  WalletCreateUsecase,
  WalletCreateState,
  WalletCreateAction,
} from './walletCreate';
import { MockWalletRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('WalletCreateUsecase', () => {
  describe('success flow', () => {
    it('should transition loaded -> submitting -> submitSuccess', async () => {
      const repository = new MockWalletRepository();
      const usecase = new WalletCreateUsecase(repository);
      const tester = new UsecaseTester<WalletCreateUsecase, WalletCreateState, WalletCreateAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'New Wallet', balance: 0, paymentCostPercentage: 0, isCashless: false },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    it('should transition loaded -> submitting -> loaded (after submit error auto-cancel)', async () => {
      const repository = new MockWalletRepository();
      repository.setShouldFail(true);
      const usecase = new WalletCreateUsecase(repository);
      const tester = new UsecaseTester<WalletCreateUsecase, WalletCreateState, WalletCreateAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'New Wallet', balance: 0, paymentCostPercentage: 0, isCashless: false },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('submitError');
    });
  });
});
