import {
  AvailabilityListUsecase,
  AvailabilityListAction,
  AvailabilityListState,
  AvailabilityListParams,
} from './availabilityList';
import { MockAvailabilityRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('AvailabilityListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading -> loaded -> revalidating -> loaded', async () => {
      const repository = new MockAvailabilityRepository();
      const usecase = new AvailabilityListUsecase(repository, { products: [] });
      const tester = new UsecaseTester<
        AvailabilityListUsecase,
        AvailabilityListState,
        AvailabilityListAction,
        AvailabilityListParams
      >(usecase);

      expect(tester.state).toEqual({
        type: 'loading',
        products: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(tester.state).toEqual({
        type: 'loaded',
        products: repository.products,
        errorMessage: null,
      });

      tester.dispatch({ type: 'FETCH' });
      expect(tester.state).toEqual({
        type: 'revalidating',
        products: repository.products,
        errorMessage: null,
      });

      await flushPromises();
      expect(tester.state).toEqual({
        type: 'loaded',
        products: repository.products,
        errorMessage: null,
      });
    });
  });

  describe('failed flow', () => {
    it('should transition loading -> error -> loading -> loaded', async () => {
      const repository = new MockAvailabilityRepository();
      repository.setShouldFail(true);
      const usecase = new AvailabilityListUsecase(repository, { products: [] });
      const tester = new UsecaseTester<
        AvailabilityListUsecase,
        AvailabilityListState,
        AvailabilityListAction,
        AvailabilityListParams
      >(usecase);

      expect(tester.state).toEqual({
        type: 'loading',
        products: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(tester.state).toEqual({
        type: 'error',
        products: [],
        errorMessage: 'Failed to fetch availability',
      });

      repository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state).toEqual({
        type: 'loading',
        products: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(tester.state).toEqual({
        type: 'loaded',
        products: repository.products,
        errorMessage: null,
      });
    });
  });

  it('shows loaded state when initial data is given', () => {
    const repository = new MockAvailabilityRepository();
    const products = [repository.products[0]];
    const usecase = new AvailabilityListUsecase(repository, { products });
    const tester = new UsecaseTester<
      AvailabilityListUsecase,
      AvailabilityListState,
      AvailabilityListAction,
      AvailabilityListParams
    >(usecase);

    expect(tester.state).toEqual({
      type: 'loaded',
      products,
      errorMessage: null,
    });
  });
});
