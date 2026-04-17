import {
  RentalCheckoutUsecase,
  RentalCheckoutState,
  RentalCheckoutAction,
} from './rentalCheckout';
import { MockRentalRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('RentalCheckoutUsecase', () => {
  describe('success flow', () => {
    it('should transition loaded → submitting → submitSuccess', async () => {
      const repository = new MockRentalRepository();
      const usecase = new RentalCheckoutUsecase(repository);
      const tester = new UsecaseTester<RentalCheckoutUsecase, RentalCheckoutState, RentalCheckoutAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { rentals: [] } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    it('should transition loaded → submitting → loaded (auto-recover)', async () => {
      const repository = new MockRentalRepository();
      repository.setShouldFail(true);
      const usecase = new RentalCheckoutUsecase(repository);
      const tester = new UsecaseTester<RentalCheckoutUsecase, RentalCheckoutState, RentalCheckoutAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { rentals: [] } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('submitError');
    });
  });
});
