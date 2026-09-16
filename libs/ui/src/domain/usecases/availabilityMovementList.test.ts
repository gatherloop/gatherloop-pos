import {
  AvailabilityMovementListUsecase,
  AvailabilityMovementListState,
  AvailabilityMovementListAction,
} from './availabilityMovementList';
import { MockAvailabilityRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('AvailabilityMovementListUsecase', () => {
  describe('success flow', () => {
    it('should transition idle -> loading -> loaded with the matching movements', async () => {
      const repository = new MockAvailabilityRepository();
      const usecase = new AvailabilityMovementListUsecase(repository);
      const tester = new UsecaseTester<
        AvailabilityMovementListUsecase,
        AvailabilityMovementListState,
        AvailabilityMovementListAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('idle');

      tester.dispatch({ type: 'FETCH', level: 'variant', id: 4 });
      expect(tester.state).toEqual({
        type: 'loading',
        level: 'variant',
        id: 4,
        movements: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
      expect(tester.state.movements).toEqual(
        repository.movements.filter((m) => m.variantId === 4)
      );

      tester.dispatch({ type: 'RESET' });
      expect(tester.state.type).toBe('idle');
    });
  });

  describe('failed flow', () => {
    it('should transition loading -> error', async () => {
      const repository = new MockAvailabilityRepository();
      repository.setShouldFail(true);
      const usecase = new AvailabilityMovementListUsecase(repository);
      const tester = new UsecaseTester<
        AvailabilityMovementListUsecase,
        AvailabilityMovementListState,
        AvailabilityMovementListAction,
        undefined
      >(usecase);

      tester.dispatch({ type: 'FETCH', level: 'product', id: 3 });
      await flushPromises();

      expect(tester.state.type).toBe('error');
      expect(tester.state.errorMessage).toBe('Failed to fetch availability history');
    });
  });
});
