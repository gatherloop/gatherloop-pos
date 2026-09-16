import {
  AvailabilityUpdateUsecase,
  AvailabilityUpdateState,
  AvailabilityUpdateAction,
} from './availabilityUpdate';
import { MockAvailabilityRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('AvailabilityUpdateUsecase', () => {
  describe('success flow', () => {
    it('should transition loaded -> submitting -> submitSuccess', async () => {
      const repository = new MockAvailabilityRepository();
      const usecase = new AvailabilityUpdateUsecase(repository);
      const tester = new UsecaseTester<
        AvailabilityUpdateUsecase,
        AvailabilityUpdateState,
        AvailabilityUpdateAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: {
          products: [{ productId: 1, isAvailable: false }],
          variants: [],
        },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    it('should transition loaded -> submitting -> submitError -> loaded', async () => {
      const repository = new MockAvailabilityRepository();
      repository.setShouldFail(true);
      const usecase = new AvailabilityUpdateUsecase(repository);
      const tester = new UsecaseTester<
        AvailabilityUpdateUsecase,
        AvailabilityUpdateState,
        AvailabilityUpdateAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: {
          products: [{ productId: 1, isAvailable: false }],
          variants: [],
        },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitError');

      tester.dispatch({ type: 'SUBMIT_CANCEL' });
      expect(tester.state.type).toBe('loaded');
    });
  });
});
