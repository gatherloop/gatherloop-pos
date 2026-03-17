import {
  SupplierCreateUsecase,
  SupplierCreateState,
  SupplierCreateAction,
} from './supplierCreate';
import { MockSupplierRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('SupplierCreateUsecase', () => {
  describe('success flow', () => {
    it('should transition loaded → submitting → submitSuccess', async () => {
      const repository = new MockSupplierRepository();
      const usecase = new SupplierCreateUsecase(repository);
      const tester = new UsecaseTester<SupplierCreateUsecase, SupplierCreateState, SupplierCreateAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { name: 'New Supplier', address: 'Address', mapsLink: '', phone: '' } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    it('should transition loaded → submitting → loaded (auto-recover)', async () => {
      const repository = new MockSupplierRepository();
      repository.setShouldFail(true);
      const usecase = new SupplierCreateUsecase(repository);
      const tester = new UsecaseTester<SupplierCreateUsecase, SupplierCreateState, SupplierCreateAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { name: 'New Supplier', address: 'Address', mapsLink: '', phone: '' } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });
});
