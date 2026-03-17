import {
  RentalCheckinUsecase,
  RentalCheckinState,
  RentalCheckinAction,
} from './rentalCheckin';
import { MockRentalRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('RentalCheckinUsecase', () => {
  describe('success flow', () => {
    it('should transition loaded → submitting → submitSuccess', async () => {
      const repository = new MockRentalRepository();
      const usecase = new RentalCheckinUsecase(repository);
      const tester = new UsecaseTester<RentalCheckinUsecase, RentalCheckinState, RentalCheckinAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { name: 'Guest', rentals: [], checkinAt: null } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    it('should transition loaded → submitting → loaded (auto-recover)', async () => {
      const repository = new MockRentalRepository();
      repository.setShouldFail(true);
      const usecase = new RentalCheckinUsecase(repository);
      const tester = new UsecaseTester<RentalCheckinUsecase, RentalCheckinState, RentalCheckinAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { name: 'Guest', rentals: [], checkinAt: null } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });
});
