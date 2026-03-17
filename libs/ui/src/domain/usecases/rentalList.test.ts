import {
  RentalListUsecase,
  RentalListAction,
  RentalListState,
  RentalListParams,
} from './rentalList';
import {
  MockRentalRepository,
  MockRentalListQueryRepository,
} from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('RentalListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → revalidating → loaded → changingParams', async () => {
      const repository = new MockRentalRepository();
      const rentalListQueryRepository = new MockRentalListQueryRepository();
      const usecase = new RentalListUsecase(
        repository,
        rentalListQueryRepository,
        { rentals: [], totalItem: 0 }
      );

      const rentalList = new UsecaseTester<
        RentalListUsecase,
        RentalListState,
        RentalListAction,
        RentalListParams
      >(usecase);

      expect(rentalList.state).toEqual({
        type: 'loading',
        rentals: [],
        totalItem: 0,
        page: rentalListQueryRepository.getPage(),
        query: rentalListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: rentalListQueryRepository.getSortBy(),
        orderBy: rentalListQueryRepository.getOrderBy(),
        checkoutStatus: rentalListQueryRepository.getCheckoutStatus(),
        itemPerPage: rentalListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      await flushPromises();
      expect(rentalList.state).toEqual({
        type: 'loaded',
        rentals: repository.rentals,
        totalItem: repository.rentals.length,
        page: rentalListQueryRepository.getPage(),
        query: rentalListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: rentalListQueryRepository.getSortBy(),
        orderBy: rentalListQueryRepository.getOrderBy(),
        checkoutStatus: rentalListQueryRepository.getCheckoutStatus(),
        itemPerPage: rentalListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      rentalList.dispatch({ type: 'FETCH' });
      expect(rentalList.state).toEqual({
        type: 'revalidating',
        rentals: repository.rentals,
        totalItem: repository.rentals.length,
        page: rentalListQueryRepository.getPage(),
        query: rentalListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: rentalListQueryRepository.getSortBy(),
        orderBy: rentalListQueryRepository.getOrderBy(),
        checkoutStatus: rentalListQueryRepository.getCheckoutStatus(),
        itemPerPage: rentalListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      await flushPromises();
      expect(rentalList.state).toEqual({
        type: 'loaded',
        rentals: repository.rentals,
        totalItem: repository.rentals.length,
        page: rentalListQueryRepository.getPage(),
        query: rentalListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: rentalListQueryRepository.getSortBy(),
        orderBy: rentalListQueryRepository.getOrderBy(),
        checkoutStatus: rentalListQueryRepository.getCheckoutStatus(),
        itemPerPage: rentalListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      rentalList.dispatch({ type: 'CHANGE_PARAMS', page: 2 });
      expect(rentalList.state).toEqual({
        type: 'changingParams',
        rentals: repository.rentals,
        totalItem: repository.rentals.length,
        page: 2,
        query: rentalListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: rentalListQueryRepository.getSortBy(),
        orderBy: rentalListQueryRepository.getOrderBy(),
        checkoutStatus: rentalListQueryRepository.getCheckoutStatus(),
        itemPerPage: rentalListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });
  });

  describe('error flow', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const rentalRepository = new MockRentalRepository();
      rentalRepository.setShouldFail(true);
      const rentalListQueryRepository = new MockRentalListQueryRepository();
      const usecase = new RentalListUsecase(
        rentalRepository,
        rentalListQueryRepository,
        { rentals: [], totalItem: 0 }
      );
      const rentalList = new UsecaseTester<
        RentalListUsecase,
        RentalListState,
        RentalListAction,
        RentalListParams
      >(usecase);

      expect(rentalList.state).toEqual({
        type: 'loading',
        rentals: [],
        totalItem: 0,
        page: rentalListQueryRepository.getPage(),
        query: rentalListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: rentalListQueryRepository.getSortBy(),
        orderBy: rentalListQueryRepository.getOrderBy(),
        checkoutStatus: rentalListQueryRepository.getCheckoutStatus(),
        itemPerPage: rentalListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      await flushPromises();
      expect(rentalList.state).toEqual({
        type: 'error',
        rentals: [],
        totalItem: 0,
        page: rentalListQueryRepository.getPage(),
        query: rentalListQueryRepository.getSearchQuery(),
        errorMessage: 'Failed to fetch rentals',
        sortBy: rentalListQueryRepository.getSortBy(),
        orderBy: rentalListQueryRepository.getOrderBy(),
        checkoutStatus: rentalListQueryRepository.getCheckoutStatus(),
        itemPerPage: rentalListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      rentalRepository.setShouldFail(false);
      rentalList.dispatch({ type: 'FETCH' });
      expect(rentalList.state).toEqual({
        type: 'loading',
        rentals: [],
        totalItem: 0,
        page: rentalListQueryRepository.getPage(),
        query: rentalListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: rentalListQueryRepository.getSortBy(),
        orderBy: rentalListQueryRepository.getOrderBy(),
        checkoutStatus: rentalListQueryRepository.getCheckoutStatus(),
        itemPerPage: rentalListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      await flushPromises();
      expect(rentalList.state).toEqual({
        type: 'loaded',
        rentals: rentalRepository.rentals,
        totalItem: rentalRepository.rentals.length,
        page: rentalListQueryRepository.getPage(),
        query: rentalListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: rentalListQueryRepository.getSortBy(),
        orderBy: rentalListQueryRepository.getOrderBy(),
        checkoutStatus: rentalListQueryRepository.getCheckoutStatus(),
        itemPerPage: rentalListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });
  });

  it('should show loaded state when initial data is given', async () => {
    const rentalRepository = new MockRentalRepository();
    const rentalListQueryRepository = new MockRentalListQueryRepository();
    const rentals = [rentalRepository.rentals[0]];
    const usecase = new RentalListUsecase(
      rentalRepository,
      rentalListQueryRepository,
      { rentals, totalItem: 1 }
    );
    const rentalList = new UsecaseTester<
      RentalListUsecase,
      RentalListState,
      RentalListAction,
      RentalListParams
    >(usecase);

    expect(rentalList.state.type).toBe('loaded');
    expect(rentalList.state.rentals).toEqual(rentals);
    expect(rentalList.state.totalItem).toBe(rentals.length);
  });
});
