import {
  MaterialCreateUsecase,
  MaterialCreateState,
  MaterialCreateAction,
} from './materialCreate';
import { MockMaterialRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('MaterialCreateUsecase', () => {
  describe('success flow', () => {
    it('should transition loaded → submitting → submitSuccess', async () => {
      const repository = new MockMaterialRepository();
      const usecase = new MaterialCreateUsecase(repository);
      const tester = new UsecaseTester<MaterialCreateUsecase, MaterialCreateState, MaterialCreateAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { name: 'New Material', price: 100, unit: 'kg', description: '' } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    it('should transition loaded → submitting → loaded (auto-recover)', async () => {
      const repository = new MockMaterialRepository();
      repository.shouldFail = true;
      const usecase = new MaterialCreateUsecase(repository);
      const tester = new UsecaseTester<MaterialCreateUsecase, MaterialCreateState, MaterialCreateAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { name: 'New Material', price: 100, unit: 'kg', description: '' } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });
});
