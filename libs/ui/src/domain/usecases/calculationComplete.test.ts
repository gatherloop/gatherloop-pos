import {
  CalculationCompleteUsecase,
  CalculationCompleteState,
  CalculationCompleteAction,
} from './calculationComplete';
import { MockCalculationRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('CalculationCompleteUsecase', () => {
  describe('success flow', () => {
    it('should transition hidden → shown → completing → hidden', async () => {
      const repository = new MockCalculationRepository();
      const usecase = new CalculationCompleteUsecase(repository);
      const tester = new UsecaseTester<CalculationCompleteUsecase, CalculationCompleteState, CalculationCompleteAction, undefined>(usecase);

      expect(tester.state).toEqual({ type: 'hidden', calculationId: null });

      tester.dispatch({ type: 'SHOW_CONFIRMATION', calculationId: 1 });
      expect(tester.state).toEqual({ type: 'shown', calculationId: 1 });

      tester.dispatch({ type: 'COMPLETE' });
      expect(tester.state.type).toBe('completing');

      await flushPromises();
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
    it('should transition hidden → shown → completing → shown (error recovery)', async () => {
      const repository = new MockCalculationRepository();
      repository.setShouldFail(true);
      const usecase = new CalculationCompleteUsecase(repository);
      const tester = new UsecaseTester<CalculationCompleteUsecase, CalculationCompleteState, CalculationCompleteAction, undefined>(usecase);

      expect(tester.state.type).toBe('hidden');

      tester.dispatch({ type: 'SHOW_CONFIRMATION', calculationId: 1 });
      expect(tester.state.type).toBe('shown');

      tester.dispatch({ type: 'COMPLETE' });
      expect(tester.state.type).toBe('completing');

      await flushPromises();
      // completing -> completingError -> onStateChange(completingError) -> COMPLETE_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
