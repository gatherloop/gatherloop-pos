import {
  CategoryUpdateUsecase,
  CategoryUpdateState,
  CategoryUpdateAction,
  CategoryUpdateParams,
} from './categoryUpdate';
import { MockCategoryRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('CategoryUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    it('should transition loading → loaded → submitting → submitSuccess', async () => {
      const repository = new MockCategoryRepository();
      const usecase = new CategoryUpdateUsecase(repository, { categoryId: 1, category: null });
      const tester = new UsecaseTester<CategoryUpdateUsecase, CategoryUpdateState, CategoryUpdateAction, CategoryUpdateParams>(usecase);

      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { name: 'Updated Category' } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockCategoryRepository();
      repository.setShouldFail(true);
      const usecase = new CategoryUpdateUsecase(repository, { categoryId: 1, category: null });
      const tester = new UsecaseTester<CategoryUpdateUsecase, CategoryUpdateState, CategoryUpdateAction, CategoryUpdateParams>(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('error');

      repository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - submit error', () => {
    it('should transition loaded → submitting → loaded (auto-recovery)', async () => {
      const repository = new MockCategoryRepository();
      repository.setShouldFail(true);
      const usecase = new CategoryUpdateUsecase(repository, {
        categoryId: 1,
        category: repository.categories[0],
      });
      const tester = new UsecaseTester<CategoryUpdateUsecase, CategoryUpdateState, CategoryUpdateAction, CategoryUpdateParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { name: 'Updated Category' } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });

  it('starts in loaded state when data is preloaded', () => {
    const repository = new MockCategoryRepository();
    const existing = repository.categories[0];
    const usecase = new CategoryUpdateUsecase(repository, { categoryId: 1, category: existing });
    const tester = new UsecaseTester<CategoryUpdateUsecase, CategoryUpdateState, CategoryUpdateAction, CategoryUpdateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
