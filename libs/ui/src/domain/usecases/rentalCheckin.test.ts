import {
  RentalCheckinUsecase,
  RentalCheckinState,
  RentalCheckinAction,
} from './rentalCheckin';
import { MockRentalRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('RentalCheckinUsecase', () => {
  describe('success flow', () => {
    const repository = new MockRentalRepository();
    const usecase = new RentalCheckinUsecase(repository);
    let tester: UsecaseTester<RentalCheckinUsecase, RentalCheckinState, RentalCheckinAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { name: 'Guest', rentals: [], checkinAt: null } });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful checkin', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    const repository = new MockRentalRepository();
    repository.setShouldFail(true);
    const usecase = new RentalCheckinUsecase(repository);
    let tester: UsecaseTester<RentalCheckinUsecase, RentalCheckinState, RentalCheckinAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { name: 'Guest', rentals: [], checkinAt: null } });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });
});
