import {
  WalletCreateUsecase,
  WalletCreateState,
  WalletCreateAction,
} from './walletCreate';
import { MockWalletRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('WalletCreateUsecase', () => {
  describe('success flow', () => {
    const repository = new MockWalletRepository();
    const usecase = new WalletCreateUsecase(repository);
    let tester: UsecaseTester<WalletCreateUsecase, WalletCreateState, WalletCreateAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'New Wallet', balance: 0, paymentCostPercentage: 0, isCashless: false },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful create', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    const repository = new MockWalletRepository();
    repository.setShouldFail(true);
    const usecase = new WalletCreateUsecase(repository);
    let tester: UsecaseTester<WalletCreateUsecase, WalletCreateState, WalletCreateAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'New Wallet', balance: 0, paymentCostPercentage: 0, isCashless: false },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });
});
