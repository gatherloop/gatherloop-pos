import {
  SupplierCreateUsecase,
  SupplierCreateState,
  SupplierCreateAction,
} from './supplierCreate';
import { MockSupplierRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('SupplierCreateUsecase', () => {
  describe('success flow', () => {
    const repository = new MockSupplierRepository();
    const usecase = new SupplierCreateUsecase(repository);
    let tester: UsecaseTester<SupplierCreateUsecase, SupplierCreateState, SupplierCreateAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { name: 'New Supplier', address: 'Address', mapsLink: '', phone: '' } });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful create', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    const repository = new MockSupplierRepository();
    repository.setShouldFail(true);
    const usecase = new SupplierCreateUsecase(repository);
    let tester: UsecaseTester<SupplierCreateUsecase, SupplierCreateState, SupplierCreateAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { name: 'New Supplier', address: 'Address', mapsLink: '', phone: '' } });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });
});
