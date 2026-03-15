import {
  SupplierUpdateUsecase,
  SupplierUpdateState,
  SupplierUpdateAction,
  SupplierUpdateParams,
} from './supplierUpdate';
import { MockSupplierRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('SupplierUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    const repository = new MockSupplierRepository();
    const usecase = new SupplierUpdateUsecase(repository, { supplierId: 1, supplier: null });
    let tester: UsecaseTester<SupplierUpdateUsecase, SupplierUpdateState, SupplierUpdateAction, SupplierUpdateParams>;

    it('initializes in loading state when no data preloaded', () => {
      tester = new UsecaseTester(usecase);
      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Updated Supplier', address: 'New Address', mapsLink: '', phone: '' },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful submit', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    const repository = new MockSupplierRepository();
    repository.setShouldFail(true);
    const usecase = new SupplierUpdateUsecase(repository, { supplierId: 1, supplier: null });
    let tester: UsecaseTester<SupplierUpdateUsecase, SupplierUpdateState, SupplierUpdateAction, SupplierUpdateParams>;

    it('initializes in loading state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('error');
    });

    it('transitions to loading when FETCH is dispatched from error', () => {
      repository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - submit error', () => {
    const repository = new MockSupplierRepository();
    repository.setShouldFail(true);
    const usecase = new SupplierUpdateUsecase(repository, {
      supplierId: 1,
      supplier: repository.suppliers[0],
    });
    let tester: UsecaseTester<SupplierUpdateUsecase, SupplierUpdateState, SupplierUpdateAction, SupplierUpdateParams>;

    it('initializes in loaded state when data is preloaded', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Updated Supplier', address: 'New Address', mapsLink: '', phone: '' },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
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
