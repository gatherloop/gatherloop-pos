import {
  RentalDeleteUsecase,
  RentalDeleteState,
  RentalDeleteAction,
} from './rentalDelete';
import { MockRentalRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('RentalDeleteUsecase', () => {
  describe('success flow', () => {
    const repository = new MockRentalRepository();
    const usecase = new RentalDeleteUsecase(repository);
    let tester: UsecaseTester<RentalDeleteUsecase, RentalDeleteState, RentalDeleteAction, undefined>;

    it('initializes in hidden state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state).toEqual({ type: 'hidden', rentalId: null });
    });

    it('transitions to shown when SHOW_CONFIRMATION is dispatched', () => {
      tester.dispatch({ type: 'SHOW_CONFIRMATION', rentalId: 1 });
      expect(tester.state).toEqual({ type: 'shown', rentalId: 1 });
    });

    it('transitions to deleting when DELETE is dispatched', () => {
      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');
    });

    it('auto-transitions to hidden after successful delete', async () => {
      await Promise.resolve();
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
    const repository = new MockRentalRepository();
    repository.setShouldFail(true);
    const usecase = new RentalDeleteUsecase(repository);
    let tester: UsecaseTester<RentalDeleteUsecase, RentalDeleteState, RentalDeleteAction, undefined>;

    it('initializes in hidden state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('hidden');
    });

    it('transitions to shown when SHOW_CONFIRMATION is dispatched', () => {
      tester.dispatch({ type: 'SHOW_CONFIRMATION', rentalId: 1 });
      expect(tester.state.type).toBe('shown');
    });

    it('transitions to deleting when DELETE is dispatched', () => {
      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');
    });

    it('auto-recovers to shown state after delete error', async () => {
      await Promise.resolve();
      // deleting -> deletingError -> onStateChange(deletingError) -> DELETE_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
