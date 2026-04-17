import {
  CalculationCreateUsecase,
  CalculationCreateState,
  CalculationCreateAction,
  CalculationCreateParams,
} from './calculationCreate';
import { MockCalculationRepository, MockWalletRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('CalculationCreateUsecase', () => {
  describe('success flow - no preloaded wallets (fetch required)', () => {
    it('should transition idle → loading → loaded → submitting → submitSuccess', async () => {
      const calculationRepository = new MockCalculationRepository();
      const walletRepository = new MockWalletRepository();
      const usecase = new CalculationCreateUsecase(calculationRepository, walletRepository, { wallets: [] });
      const tester = new UsecaseTester<CalculationCreateUsecase, CalculationCreateState, CalculationCreateAction, CalculationCreateParams>(usecase);

      expect(tester.state.type).toBe('idle');

      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { walletId: 1, totalWallet: 1000, calculationItems: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition idle → loading → error → loading → loaded', async () => {
      const calculationRepository = new MockCalculationRepository();
      const walletRepository = new MockWalletRepository();
      walletRepository.setShouldFail(true);
      const usecase = new CalculationCreateUsecase(calculationRepository, walletRepository, { wallets: [] });
      const tester = new UsecaseTester<CalculationCreateUsecase, CalculationCreateState, CalculationCreateAction, CalculationCreateParams>(usecase);

      expect(tester.state.type).toBe('idle');

      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('error');

      walletRepository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - submit error', () => {
    it('should transition loaded → submitting → submitError', async () => {
      const calculationRepository = new MockCalculationRepository();
      calculationRepository.setShouldFail(true);
      const walletRepository = new MockWalletRepository();
      const usecase = new CalculationCreateUsecase(calculationRepository, walletRepository, {
        wallets: walletRepository.wallets,
      });
      const tester = new UsecaseTester<CalculationCreateUsecase, CalculationCreateState, CalculationCreateAction, CalculationCreateParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { walletId: 1, totalWallet: 1000, calculationItems: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitError');
    });
  });

  it('starts in loaded state when wallets are preloaded', () => {
    const calculationRepository = new MockCalculationRepository();
    const walletRepository = new MockWalletRepository();
    const usecase = new CalculationCreateUsecase(calculationRepository, walletRepository, {
      wallets: walletRepository.wallets,
    });
    const tester = new UsecaseTester<CalculationCreateUsecase, CalculationCreateState, CalculationCreateAction, CalculationCreateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
