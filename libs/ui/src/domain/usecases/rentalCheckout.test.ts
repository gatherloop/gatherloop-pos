import {
  RentalCheckoutUsecase,
  RentalCheckoutState,
  RentalCheckoutAction,
} from './rentalCheckout';
import { MockRentalRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('RentalCheckoutUsecase', () => {
  describe('success flow', () => {
    const repository = new MockRentalRepository();
    const usecase = new RentalCheckoutUsecase(repository);
    let tester: UsecaseTester<RentalCheckoutUsecase, RentalCheckoutState, RentalCheckoutAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { rentals: [] } });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful checkout', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    const repository = new MockRentalRepository();
    repository.setShouldFail(true);
    const usecase = new RentalCheckoutUsecase(repository);
    let tester: UsecaseTester<RentalCheckoutUsecase, RentalCheckoutState, RentalCheckoutAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { rentals: [] } });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });
});
