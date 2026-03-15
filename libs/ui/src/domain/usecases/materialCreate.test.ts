import {
  MaterialCreateUsecase,
  MaterialCreateState,
  MaterialCreateAction,
} from './materialCreate';
import { MockMaterialRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('MaterialCreateUsecase', () => {
  describe('success flow', () => {
    const repository = new MockMaterialRepository();
    const usecase = new MaterialCreateUsecase(repository);
    let tester: UsecaseTester<MaterialCreateUsecase, MaterialCreateState, MaterialCreateAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { name: 'New Material', price: 100, unit: 'kg', description: '' } });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful create', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    const repository = new MockMaterialRepository();
    repository.shouldFail = true;
    const usecase = new MaterialCreateUsecase(repository);
    let tester: UsecaseTester<MaterialCreateUsecase, MaterialCreateState, MaterialCreateAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { name: 'New Material', price: 100, unit: 'kg', description: '' } });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });
});
