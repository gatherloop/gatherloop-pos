import {
  CalculationDeleteUsecase,
  CalculationDeleteState,
  CalculationDeleteAction,
} from './calculationDelete';
import { MockCalculationRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('CalculationDeleteUsecase', () => {
  describe('success flow', () => {
    it('should transition hidden → shown → deleting → hidden', async () => {
      const repository = new MockCalculationRepository();
      const usecase = new CalculationDeleteUsecase(repository);
      const tester = new UsecaseTester<CalculationDeleteUsecase, CalculationDeleteState, CalculationDeleteAction, undefined>(usecase);

      expect(tester.state).toEqual({ type: 'hidden', calculationId: null });

      tester.dispatch({ type: 'SHOW_CONFIRMATION', calculationId: 1 });
      expect(tester.state).toEqual({ type: 'shown', calculationId: 1 });

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deletingSuccess -> onStateChange dispatches HIDE_CONFIRMATION -> hidden
      expect(tester.state.type).toBe('hidden');
    });
  });

  it('transitions to hidden when HIDE_CONFIRMATION is dispatched from shown', () => {
    const repository = new MockCalculationRepository();
    const usecase = new CalculationDeleteUsecase(repository);
    const tester = new UsecaseTester<CalculationDeleteUsecase, CalculationDeleteState, CalculationDeleteAction, undefined>(usecase);
    tester.dispatch({ type: 'SHOW_CONFIRMATION', calculationId: 1 });
    tester.dispatch({ type: 'HIDE_CONFIRMATION' });
    expect(tester.state.type).toBe('hidden');
  });

  describe('error flow', () => {
    it('should transition hidden → shown → deleting → shown (error recovery)', async () => {
      const repository = new MockCalculationRepository();
      repository.setShouldFail(true);
      const usecase = new CalculationDeleteUsecase(repository);
      const tester = new UsecaseTester<CalculationDeleteUsecase, CalculationDeleteState, CalculationDeleteAction, undefined>(usecase);

      expect(tester.state.type).toBe('hidden');

      tester.dispatch({ type: 'SHOW_CONFIRMATION', calculationId: 1 });
      expect(tester.state.type).toBe('shown');

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deleting -> deletingError -> onStateChange(deletingError) -> DELETE_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
