import {
  MaterialDeleteUsecase,
  MaterialDeleteState,
  MaterialDeleteAction,
} from './materialDelete';
import { MockMaterialRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('MaterialDeleteUsecase', () => {
  describe('success flow', () => {
    it('should transition hidden → shown → deleting → hidden', async () => {
      const repository = new MockMaterialRepository();
      const usecase = new MaterialDeleteUsecase(repository);
      const tester = new UsecaseTester<MaterialDeleteUsecase, MaterialDeleteState, MaterialDeleteAction, undefined>(usecase);

      expect(tester.state).toEqual({ type: 'hidden', materialId: null });

      tester.dispatch({ type: 'SHOW_CONFIRMATION', materialId: 1 });
      expect(tester.state).toEqual({ type: 'shown', materialId: 1 });

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deletingSuccess -> onStateChange dispatches HIDE_CONFIRMATION -> hidden
      expect(tester.state.type).toBe('hidden');
    });
  });

  it('transitions to hidden when HIDE_CONFIRMATION is dispatched from shown', () => {
    const repository = new MockMaterialRepository();
    const usecase = new MaterialDeleteUsecase(repository);
    const tester = new UsecaseTester<MaterialDeleteUsecase, MaterialDeleteState, MaterialDeleteAction, undefined>(usecase);
    tester.dispatch({ type: 'SHOW_CONFIRMATION', materialId: 1 });
    tester.dispatch({ type: 'HIDE_CONFIRMATION' });
    expect(tester.state.type).toBe('hidden');
  });

  describe('error flow', () => {
    it('should transition hidden → shown → deleting → shown (auto-recover)', async () => {
      const repository = new MockMaterialRepository();
      repository.shouldFail = true;
      const usecase = new MaterialDeleteUsecase(repository);
      const tester = new UsecaseTester<MaterialDeleteUsecase, MaterialDeleteState, MaterialDeleteAction, undefined>(usecase);

      expect(tester.state.type).toBe('hidden');

      tester.dispatch({ type: 'SHOW_CONFIRMATION', materialId: 1 });
      expect(tester.state.type).toBe('shown');

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deleting -> deletingError -> onStateChange(deletingError) -> DELETE_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
