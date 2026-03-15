import {
  CategoryCreateUsecase,
  CategoryCreateState,
  CategoryCreateAction,
} from './categoryCreate';
import { MockCategoryRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('CategoryCreateUsecase', () => {
  describe('success flow', () => {
    const repository = new MockCategoryRepository();
    const usecase = new CategoryCreateUsecase(repository);
    let tester: UsecaseTester<CategoryCreateUsecase, CategoryCreateState, CategoryCreateAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { name: 'New Category' } });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful create', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    const repository = new MockCategoryRepository();
    repository.setShouldFail(true);
    const usecase = new CategoryCreateUsecase(repository);
    let tester: UsecaseTester<CategoryCreateUsecase, CategoryCreateState, CategoryCreateAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { name: 'New Category' } });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });
});
