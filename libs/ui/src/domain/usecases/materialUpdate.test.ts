import {
  MaterialUpdateUsecase,
  MaterialUpdateState,
  MaterialUpdateAction,
  MaterialUpdateParams,
} from './materialUpdate';
import { MockMaterialRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('MaterialUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    const repository = new MockMaterialRepository();
    const usecase = new MaterialUpdateUsecase(repository, { materialId: 1, material: null });
    let tester: UsecaseTester<MaterialUpdateUsecase, MaterialUpdateState, MaterialUpdateAction, MaterialUpdateParams>;

    it('initializes in loading state when no data preloaded', () => {
      tester = new UsecaseTester(usecase);
      // idle -> onStateChange(idle) synchronously dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { name: 'Updated Material', price: 200, unit: 'kg', description: '' } });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful submit', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - submit error', () => {
    const repository = new MockMaterialRepository();
    repository.shouldFail = true;
    const usecase = new MaterialUpdateUsecase(repository, {
      materialId: 1,
      material: repository.materials[0],
    });
    let tester: UsecaseTester<MaterialUpdateUsecase, MaterialUpdateState, MaterialUpdateAction, MaterialUpdateParams>;

    it('initializes in loaded state when data is preloaded', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { name: 'Updated Material', price: 200, unit: 'kg', description: '' } });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });

  it('starts in loaded state when data is preloaded', () => {
    const repository = new MockMaterialRepository();
    const existing = repository.materials[0];
    const usecase = new MaterialUpdateUsecase(repository, { materialId: 1, material: existing });
    const tester = new UsecaseTester<MaterialUpdateUsecase, MaterialUpdateState, MaterialUpdateAction, MaterialUpdateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
