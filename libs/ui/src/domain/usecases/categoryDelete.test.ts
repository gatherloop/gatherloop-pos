import {
  CategoryDeleteUsecase,
  CategoryDeleteState,
  CategoryDeleteAction,
} from './categoryDelete';
import { MockCategoryRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('CategoryDeleteUsecase', () => {
  describe('success flow', () => {
    it('should transition hidden → shown → deleting → hidden', async () => {
      const repository = new MockCategoryRepository();
      const usecase = new CategoryDeleteUsecase(repository);
      const tester = new UsecaseTester<CategoryDeleteUsecase, CategoryDeleteState, CategoryDeleteAction, undefined>(usecase);

      expect(tester.state).toEqual({ type: 'hidden', categoryId: null });

      tester.dispatch({ type: 'SHOW_CONFIRMATION', categoryId: 1 });
      expect(tester.state).toEqual({ type: 'shown', categoryId: 1 });

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deletingSuccess -> onStateChange dispatches HIDE_CONFIRMATION -> hidden
      expect(tester.state.type).toBe('hidden');
    });
  });

  it('transitions to hidden when HIDE_CONFIRMATION is dispatched from shown', () => {
    const repository = new MockCategoryRepository();
    const usecase = new CategoryDeleteUsecase(repository);
    const tester = new UsecaseTester<CategoryDeleteUsecase, CategoryDeleteState, CategoryDeleteAction, undefined>(usecase);
    tester.dispatch({ type: 'SHOW_CONFIRMATION', categoryId: 1 });
    tester.dispatch({ type: 'HIDE_CONFIRMATION' });
    expect(tester.state.type).toBe('hidden');
  });

  describe('error flow', () => {
    it('should transition hidden → shown → deleting → shown (auto-recovery)', async () => {
      const repository = new MockCategoryRepository();
      repository.setShouldFail(true);
      const usecase = new CategoryDeleteUsecase(repository);
      const tester = new UsecaseTester<CategoryDeleteUsecase, CategoryDeleteState, CategoryDeleteAction, undefined>(usecase);

      expect(tester.state.type).toBe('hidden');

      tester.dispatch({ type: 'SHOW_CONFIRMATION', categoryId: 1 });
      expect(tester.state.type).toBe('shown');

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deleting -> deletingError -> onStateChange(deletingError) -> DELETE_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
