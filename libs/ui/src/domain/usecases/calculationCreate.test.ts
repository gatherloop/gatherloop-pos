import {
  CalculationCreateUsecase,
  CalculationCreateState,
  CalculationCreateAction,
  CalculationCreateParams,
} from './calculationCreate';
import { MockCalculationRepository, MockWalletRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('CalculationCreateUsecase', () => {
  describe('success flow - no preloaded wallets (fetch required)', () => {
    const calculationRepository = new MockCalculationRepository();
    const walletRepository = new MockWalletRepository();
    const usecase = new CalculationCreateUsecase(calculationRepository, walletRepository, { wallets: [] });
    let tester: UsecaseTester<CalculationCreateUsecase, CalculationCreateState, CalculationCreateAction, CalculationCreateParams>;

    it('initializes in idle state when no wallets preloaded', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('idle');
    });

    it('transitions to loading when FETCH is dispatched', () => {
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { walletId: 1, totalWallet: 1000, calculationItems: [] },
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
    const walletRepository = new MockWalletRepository();
    walletRepository.setShouldFail(true);
    const usecase = new CalculationCreateUsecase(calculationRepository, walletRepository, { wallets: [] });
    let tester: UsecaseTester<CalculationCreateUsecase, CalculationCreateState, CalculationCreateAction, CalculationCreateParams>;

    it('initializes in idle state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('idle');
    });

    it('transitions to loading when FETCH is dispatched', () => {
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('error');
    });

    it('transitions to loading when FETCH is dispatched from error', () => {
      walletRepository.setShouldFail(false);
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
    const usecase = new CalculationCreateUsecase(calculationRepository, walletRepository, {
      wallets: walletRepository.wallets,
    });
    let tester: UsecaseTester<CalculationCreateUsecase, CalculationCreateState, CalculationCreateAction, CalculationCreateParams>;

    it('initializes in loaded state when wallets are preloaded', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { walletId: 1, totalWallet: 1000, calculationItems: [] },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
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
