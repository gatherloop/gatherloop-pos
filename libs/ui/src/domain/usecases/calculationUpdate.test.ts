import {
  CalculationUpdateUsecase,
  CalculationUpdateState,
  CalculationUpdateAction,
  CalculationUpdateParams,
} from './calculationUpdate';
import { MockCalculationRepository, MockWalletRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('CalculationUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    it('should transition loading → loaded → submitting → submitSuccess', async () => {
      const calculationRepository = new MockCalculationRepository();
      const walletRepository = new MockWalletRepository();
      const usecase = new CalculationUpdateUsecase(calculationRepository, walletRepository, {
        calculationId: 1,
        calculation: null,
        wallets: [],
      });
      const tester = new UsecaseTester<CalculationUpdateUsecase, CalculationUpdateState, CalculationUpdateAction, CalculationUpdateParams>(usecase);

      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { walletId: 1, totalWallet: 1500, calculationItems: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const calculationRepository = new MockCalculationRepository();
      calculationRepository.setShouldFail(true);
      const walletRepository = new MockWalletRepository();
      const usecase = new CalculationUpdateUsecase(calculationRepository, walletRepository, {
        calculationId: 1,
        calculation: null,
        wallets: [],
      });
      const tester = new UsecaseTester<CalculationUpdateUsecase, CalculationUpdateState, CalculationUpdateAction, CalculationUpdateParams>(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('error');

      calculationRepository.setShouldFail(false);
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
      const usecase = new CalculationUpdateUsecase(calculationRepository, walletRepository, {
        calculationId: 1,
        calculation: calculationRepository.calculations[0],
        wallets: walletRepository.wallets,
      });
      const tester = new UsecaseTester<CalculationUpdateUsecase, CalculationUpdateState, CalculationUpdateAction, CalculationUpdateParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { walletId: 1, totalWallet: 1500, calculationItems: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitError');
    });
  });

  it('starts in loaded state when data is preloaded', () => {
    const calculationRepository = new MockCalculationRepository();
    const walletRepository = new MockWalletRepository();
    const existing = calculationRepository.calculations[0];
    const usecase = new CalculationUpdateUsecase(calculationRepository, walletRepository, {
      calculationId: 1,
      calculation: existing,
      wallets: walletRepository.wallets,
    });
    const tester = new UsecaseTester<CalculationUpdateUsecase, CalculationUpdateState, CalculationUpdateAction, CalculationUpdateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
