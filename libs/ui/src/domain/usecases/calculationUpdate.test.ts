import {
  CalculationUpdateUsecase,
  CalculationUpdateState,
  CalculationUpdateAction,
  CalculationUpdateParams,
} from './calculationUpdate';
import { MockCalculationRepository, MockWalletRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('CalculationUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    const calculationRepository = new MockCalculationRepository();
    const walletRepository = new MockWalletRepository();
    const usecase = new CalculationUpdateUsecase(calculationRepository, walletRepository, {
      calculationId: 1,
      calculation: null,
      wallets: [],
    });
    let tester: UsecaseTester<CalculationUpdateUsecase, CalculationUpdateState, CalculationUpdateAction, CalculationUpdateParams>;

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
        values: { walletId: 1, totalWallet: 1500, calculationItems: [] },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful submit', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    const calculationRepository = new MockCalculationRepository();
    calculationRepository.setShouldFail(true);
    const walletRepository = new MockWalletRepository();
    const usecase = new CalculationUpdateUsecase(calculationRepository, walletRepository, {
      calculationId: 1,
      calculation: null,
      wallets: [],
    });
    let tester: UsecaseTester<CalculationUpdateUsecase, CalculationUpdateState, CalculationUpdateAction, CalculationUpdateParams>;

    it('initializes in loading state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('error');
    });

    it('transitions to loading when FETCH is dispatched from error', () => {
      calculationRepository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - submit error', () => {
    const calculationRepository = new MockCalculationRepository();
    calculationRepository.setShouldFail(true);
    const walletRepository = new MockWalletRepository();
    const usecase = new CalculationUpdateUsecase(calculationRepository, walletRepository, {
      calculationId: 1,
      calculation: calculationRepository.calculations[0],
      wallets: walletRepository.wallets,
    });
    let tester: UsecaseTester<CalculationUpdateUsecase, CalculationUpdateState, CalculationUpdateAction, CalculationUpdateParams>;

    it('initializes in loaded state when data is preloaded', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { walletId: 1, totalWallet: 1500, calculationItems: [] },
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
