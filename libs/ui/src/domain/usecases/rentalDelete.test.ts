import {
  RentalDeleteUsecase,
  RentalDeleteState,
  RentalDeleteAction,
} from './rentalDelete';
import { MockRentalRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('RentalDeleteUsecase', () => {
  describe('success flow', () => {
    it('should transition hidden → shown → deleting → hidden', async () => {
      const repository = new MockRentalRepository();
      const usecase = new RentalDeleteUsecase(repository);
      const tester = new UsecaseTester<RentalDeleteUsecase, RentalDeleteState, RentalDeleteAction, undefined>(usecase);

      expect(tester.state).toEqual({ type: 'hidden', rentalId: null });

      tester.dispatch({ type: 'SHOW_CONFIRMATION', rentalId: 1 });
      expect(tester.state).toEqual({ type: 'shown', rentalId: 1 });

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deletingSuccess -> onStateChange dispatches HIDE_CONFIRMATION -> hidden
      expect(tester.state.type).toBe('hidden');
    });
  });

  it('transitions to hidden when HIDE_CONFIRMATION is dispatched from shown', () => {
    const repository = new MockRentalRepository();
    const usecase = new RentalDeleteUsecase(repository);
    const tester = new UsecaseTester<RentalDeleteUsecase, RentalDeleteState, RentalDeleteAction, undefined>(usecase);
    tester.dispatch({ type: 'SHOW_CONFIRMATION', rentalId: 1 });
    tester.dispatch({ type: 'HIDE_CONFIRMATION' });
    expect(tester.state.type).toBe('hidden');
  });

  describe('error flow', () => {
    it('should transition hidden → shown → deleting → shown (auto-recover)', async () => {
      const repository = new MockRentalRepository();
      repository.setShouldFail(true);
      const usecase = new RentalDeleteUsecase(repository);
      const tester = new UsecaseTester<RentalDeleteUsecase, RentalDeleteState, RentalDeleteAction, undefined>(usecase);

      expect(tester.state.type).toBe('hidden');

      tester.dispatch({ type: 'SHOW_CONFIRMATION', rentalId: 1 });
      expect(tester.state.type).toBe('shown');

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deleting -> deletingError -> onStateChange(deletingError) -> DELETE_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
