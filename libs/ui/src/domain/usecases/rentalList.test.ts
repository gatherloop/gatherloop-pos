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
import { UsecaseTester } from '../../utils/usecase';

describe('RentalListUsecase', () => {
  let rentalRepository: MockRentalRepository;
  let rentalListQueryRepository: MockRentalListQueryRepository;

  beforeEach(() => {
    rentalRepository = new MockRentalRepository();
    rentalListQueryRepository = new MockRentalListQueryRepository();
  });

  describe('success flow', () => {
    const repository = new MockRentalRepository();
    const rentalListQueryRepository = new MockRentalListQueryRepository();
    const usecase = new RentalListUsecase(
      repository,
      rentalListQueryRepository,
      { rentals: [], totalItem: 0 }
    );

    let rentalList: UsecaseTester<
      RentalListUsecase,
      RentalListState,
      RentalListAction,
      RentalListParams
    >;

    it('initialize with loading state', () => {
      rentalList = new UsecaseTester<
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
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
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
    });

    it('transition to revalidating state when FETCH action is dispatched', () => {
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
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
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
    });

    it('transition to changingParams state after CHANGE_PARAMS action is dispatched', () => {
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
    const rentalRepository = new MockRentalRepository();
    rentalRepository.setShouldFail(true);
    const rentalListQueryRepository = new MockRentalListQueryRepository();
    const usecase = new RentalListUsecase(
      rentalRepository,
      rentalListQueryRepository,
      { rentals: [], totalItem: 0 }
    );
    let rentalList: UsecaseTester<
      RentalListUsecase,
      RentalListState,
      RentalListAction,
      RentalListParams
    >;

    it('initialize with loading state', () => {
      rentalList = new UsecaseTester<
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
    });

    it('transition to error state after failed fetch', async () => {
      await Promise.resolve();
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
    });

    it('transition to loading state when FETCH action is dispatched', () => {
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
    });

    it('transition to loaded state after successful fetch', async () => {
      await Promise.resolve();
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
