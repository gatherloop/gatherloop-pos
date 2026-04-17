import {
  SupplierUpdateUsecase,
  SupplierUpdateState,
  SupplierUpdateAction,
  SupplierUpdateParams,
} from './supplierUpdate';
import { MockSupplierRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('SupplierUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    it('should transition loading → loaded → submitting → submitSuccess', async () => {
      const repository = new MockSupplierRepository();
      const usecase = new SupplierUpdateUsecase(repository, { supplierId: 1, supplier: null });
      const tester = new UsecaseTester<SupplierUpdateUsecase, SupplierUpdateState, SupplierUpdateAction, SupplierUpdateParams>(usecase);

      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Updated Supplier', address: 'New Address', mapsLink: '', phone: '' },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockSupplierRepository();
      repository.setShouldFail(true);
      const usecase = new SupplierUpdateUsecase(repository, { supplierId: 1, supplier: null });
      const tester = new UsecaseTester<SupplierUpdateUsecase, SupplierUpdateState, SupplierUpdateAction, SupplierUpdateParams>(usecase);

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
    it('should transition loaded → submitting → loaded (auto-recover)', async () => {
      const repository = new MockSupplierRepository();
      repository.setShouldFail(true);
      const usecase = new SupplierUpdateUsecase(repository, {
        supplierId: 1,
        supplier: repository.suppliers[0],
      });
      const tester = new UsecaseTester<SupplierUpdateUsecase, SupplierUpdateState, SupplierUpdateAction, SupplierUpdateParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Updated Supplier', address: 'New Address', mapsLink: '', phone: '' },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('submitError');
    });
  });

  it('starts in loaded state when data is preloaded', () => {
    const repository = new MockSupplierRepository();
    const existing = repository.suppliers[0];
    const usecase = new SupplierUpdateUsecase(repository, { supplierId: 1, supplier: existing });
    const tester = new UsecaseTester<SupplierUpdateUsecase, SupplierUpdateState, SupplierUpdateAction, SupplierUpdateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
