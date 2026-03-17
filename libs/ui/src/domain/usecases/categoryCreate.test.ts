import {
  CategoryCreateUsecase,
  CategoryCreateState,
  CategoryCreateAction,
} from './categoryCreate';
import { MockCategoryRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('CategoryCreateUsecase', () => {
  describe('success flow', () => {
    it('should transition loaded → submitting → submitSuccess', async () => {
      const repository = new MockCategoryRepository();
      const usecase = new CategoryCreateUsecase(repository);
      const tester = new UsecaseTester<CategoryCreateUsecase, CategoryCreateState, CategoryCreateAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { name: 'New Category' } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    it('should transition loaded → submitting → loaded (auto-recovery)', async () => {
      const repository = new MockCategoryRepository();
      repository.setShouldFail(true);
      const usecase = new CategoryCreateUsecase(repository);
      const tester = new UsecaseTester<CategoryCreateUsecase, CategoryCreateState, CategoryCreateAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { name: 'New Category' } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });
});
