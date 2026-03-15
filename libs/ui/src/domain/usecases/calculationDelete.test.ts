import {
  CalculationDeleteUsecase,
  CalculationDeleteState,
  CalculationDeleteAction,
} from './calculationDelete';
import { MockCalculationRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('CalculationDeleteUsecase', () => {
  describe('success flow', () => {
    const repository = new MockCalculationRepository();
    const usecase = new CalculationDeleteUsecase(repository);
    let tester: UsecaseTester<CalculationDeleteUsecase, CalculationDeleteState, CalculationDeleteAction, undefined>;

    it('initializes in hidden state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state).toEqual({ type: 'hidden', calculationId: null });
    });

    it('transitions to shown when SHOW_CONFIRMATION is dispatched', () => {
      tester.dispatch({ type: 'SHOW_CONFIRMATION', calculationId: 1 });
      expect(tester.state).toEqual({ type: 'shown', calculationId: 1 });
    });

    it('transitions to deleting when DELETE is dispatched', () => {
      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');
    });

    it('auto-transitions to hidden after successful delete', async () => {
      await Promise.resolve();
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
    const repository = new MockCalculationRepository();
    repository.setShouldFail(true);
    const usecase = new CalculationDeleteUsecase(repository);
    let tester: UsecaseTester<CalculationDeleteUsecase, CalculationDeleteState, CalculationDeleteAction, undefined>;

    it('initializes in hidden state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('hidden');
    });

    it('transitions to shown when SHOW_CONFIRMATION is dispatched', () => {
      tester.dispatch({ type: 'SHOW_CONFIRMATION', calculationId: 1 });
      expect(tester.state.type).toBe('shown');
    });

    it('transitions to deleting when DELETE is dispatched', () => {
      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');
    });

    it('auto-recovers to shown state after delete error', async () => {
      await Promise.resolve();
      // deleting -> deletingError -> onStateChange(deletingError) -> DELETE_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
