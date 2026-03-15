import {
  CalculationCompleteUsecase,
  CalculationCompleteState,
  CalculationCompleteAction,
} from './calculationComplete';
import { MockCalculationRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('CalculationCompleteUsecase', () => {
  describe('success flow', () => {
    const repository = new MockCalculationRepository();
    const usecase = new CalculationCompleteUsecase(repository);
    let tester: UsecaseTester<CalculationCompleteUsecase, CalculationCompleteState, CalculationCompleteAction, undefined>;

    it('initializes in hidden state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state).toEqual({ type: 'hidden', calculationId: null });
    });

    it('transitions to shown when SHOW_CONFIRMATION is dispatched', () => {
      tester.dispatch({ type: 'SHOW_CONFIRMATION', calculationId: 1 });
      expect(tester.state).toEqual({ type: 'shown', calculationId: 1 });
    });

    it('transitions to completing when COMPLETE is dispatched', () => {
      tester.dispatch({ type: 'COMPLETE' });
      expect(tester.state.type).toBe('completing');
    });

    it('auto-transitions to hidden after successful complete', async () => {
      await Promise.resolve();
      // completingSuccess -> onStateChange dispatches HIDE_CONFIRMATION -> hidden
      expect(tester.state.type).toBe('hidden');
    });
  });

  it('transitions to hidden when HIDE_CONFIRMATION is dispatched from shown', () => {
    const repository = new MockCalculationRepository();
    const usecase = new CalculationCompleteUsecase(repository);
    const tester = new UsecaseTester<CalculationCompleteUsecase, CalculationCompleteState, CalculationCompleteAction, undefined>(usecase);
    tester.dispatch({ type: 'SHOW_CONFIRMATION', calculationId: 1 });
    tester.dispatch({ type: 'HIDE_CONFIRMATION' });
    expect(tester.state.type).toBe('hidden');
  });

  describe('error flow', () => {
    const repository = new MockCalculationRepository();
    repository.setShouldFail(true);
    const usecase = new CalculationCompleteUsecase(repository);
    let tester: UsecaseTester<CalculationCompleteUsecase, CalculationCompleteState, CalculationCompleteAction, undefined>;

    it('initializes in hidden state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('hidden');
    });

    it('transitions to shown when SHOW_CONFIRMATION is dispatched', () => {
      tester.dispatch({ type: 'SHOW_CONFIRMATION', calculationId: 1 });
      expect(tester.state.type).toBe('shown');
    });

    it('transitions to completing when COMPLETE is dispatched', () => {
      tester.dispatch({ type: 'COMPLETE' });
      expect(tester.state.type).toBe('completing');
    });

    it('auto-recovers to shown state after complete error', async () => {
      await Promise.resolve();
      // completing -> completingError -> onStateChange(completingError) -> COMPLETE_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
