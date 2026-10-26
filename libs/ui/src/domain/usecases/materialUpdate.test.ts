import {
  MaterialUpdateUsecase,
  MaterialUpdateState,
  MaterialUpdateAction,
  MaterialUpdateParams,
} from './materialUpdate';
import { MockMaterialRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('MaterialUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    it('should transition loading → loaded → submitting → submitSuccess', async () => {
      const repository = new MockMaterialRepository();
      const usecase = new MaterialUpdateUsecase(repository, { materialId: 1, material: null });
      const tester = new UsecaseTester<MaterialUpdateUsecase, MaterialUpdateState, MaterialUpdateAction, MaterialUpdateParams>(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { name: 'Updated Material', price: 200, unit: 'kg', description: '' } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - submit error', () => {
    it('should transition loaded → submitting → loaded (auto-recover)', async () => {
      const repository = new MockMaterialRepository();
      repository.shouldFail = true;
      const usecase = new MaterialUpdateUsecase(repository, {
        materialId: 1,
        material: repository.materials[0],
      });
      const tester = new UsecaseTester<MaterialUpdateUsecase, MaterialUpdateState, MaterialUpdateAction, MaterialUpdateParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { name: 'Updated Material', price: 200, unit: 'kg', description: '' } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitError');
    });
  });

  it('takes weekly usage from the preloaded material', () => {
    const repository = new MockMaterialRepository();
    const existing = { ...repository.materials[0], weeklyUsage: 395 };
    const usecase = new MaterialUpdateUsecase(repository, { materialId: 1, material: existing });
    const tester = new UsecaseTester<MaterialUpdateUsecase, MaterialUpdateState, MaterialUpdateAction, MaterialUpdateParams>(usecase);
    expect(tester.state.weeklyUsage).toBe(395);
  });

  it('takes weekly usage from the fetched material', async () => {
    const repository = new MockMaterialRepository();
    repository.materials[0] = { ...repository.materials[0], weeklyUsage: 120 };
    const usecase = new MaterialUpdateUsecase(repository, { materialId: 1, material: null });
    const tester = new UsecaseTester<MaterialUpdateUsecase, MaterialUpdateState, MaterialUpdateAction, MaterialUpdateParams>(usecase);

    expect(tester.state.weeklyUsage).toBe(0);

    await flushPromises();
    expect(tester.state.type).toBe('loaded');
    expect(tester.state.weeklyUsage).toBe(120);
  });

  it('starts in loaded state when data is preloaded', () => {
    const repository = new MockMaterialRepository();
    const existing = repository.materials[0];
    const usecase = new MaterialUpdateUsecase(repository, { materialId: 1, material: existing });
    const tester = new UsecaseTester<MaterialUpdateUsecase, MaterialUpdateState, MaterialUpdateAction, MaterialUpdateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
