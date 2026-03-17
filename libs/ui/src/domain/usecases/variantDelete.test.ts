import {
  VariantDeleteUsecase,
  VariantDeleteState,
  VariantDeleteAction,
} from './variantDelete';
import { MockVariantRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('VariantDeleteUsecase', () => {
  describe('success flow', () => {
    it('should transition hidden → shown → deleting → hidden', async () => {
      const repository = new MockVariantRepository();
      const usecase = new VariantDeleteUsecase(repository);
      const tester = new UsecaseTester<VariantDeleteUsecase, VariantDeleteState, VariantDeleteAction, undefined>(usecase);

      expect(tester.state).toEqual({ type: 'hidden', variantId: null });

      tester.dispatch({ type: 'SHOW_CONFIRMATION', variantId: 1 });
      expect(tester.state).toEqual({ type: 'shown', variantId: 1 });

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deletingSuccess -> onStateChange dispatches HIDE_CONFIRMATION -> hidden
      expect(tester.state.type).toBe('hidden');
    });
  });

  it('transitions to hidden when HIDE_CONFIRMATION is dispatched from shown', () => {
    const repository = new MockVariantRepository();
    const usecase = new VariantDeleteUsecase(repository);
    const tester = new UsecaseTester<VariantDeleteUsecase, VariantDeleteState, VariantDeleteAction, undefined>(usecase);
    tester.dispatch({ type: 'SHOW_CONFIRMATION', variantId: 1 });
    tester.dispatch({ type: 'HIDE_CONFIRMATION' });
    expect(tester.state.type).toBe('hidden');
  });

  describe('error flow', () => {
    it('should transition hidden → shown → deleting → shown (auto-recover)', async () => {
      const repository = new MockVariantRepository();
      repository.setShouldFail(true);
      const usecase = new VariantDeleteUsecase(repository);
      const tester = new UsecaseTester<VariantDeleteUsecase, VariantDeleteState, VariantDeleteAction, undefined>(usecase);

      expect(tester.state.type).toBe('hidden');

      tester.dispatch({ type: 'SHOW_CONFIRMATION', variantId: 1 });
      expect(tester.state.type).toBe('shown');

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deleting -> deletingError -> onStateChange(deletingError) -> DELETE_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
