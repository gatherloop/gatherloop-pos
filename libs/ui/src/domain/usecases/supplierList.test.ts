import {
  SupplierListUsecase,
  SupplierListAction,
  SupplierListState,
  SupplierListParams,
} from './supplierList';
import {
  MockSupplierRepository,
  MockSupplierListQueryRepository,
} from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('SupplierListUsecase', () => {
  let supplierRepository: MockSupplierRepository;
  let supplierListQueryRepository: MockSupplierListQueryRepository;

  beforeEach(() => {
    supplierRepository = new MockSupplierRepository();
    supplierListQueryRepository = new MockSupplierListQueryRepository();
  });

  describe('success flow', () => {
    const repository = new MockSupplierRepository();
    const supplierListQueryRepository = new MockSupplierListQueryRepository();
    const usecase = new SupplierListUsecase(
      repository,
      supplierListQueryRepository,
      { suppliers: [], totalItem: 0 }
    );

    let supplierList: UsecaseTester<
      SupplierListUsecase,
      SupplierListState,
      SupplierListAction,
      SupplierListParams
    >;

    it('initialize with loading state', () => {
      supplierList = new UsecaseTester<
        SupplierListUsecase,
        SupplierListState,
        SupplierListAction,
        SupplierListParams
      >(usecase);

      expect(supplierList.state).toEqual({
        type: 'loading',
        suppliers: [],
        totalItem: 0,
        page: supplierListQueryRepository.getPage(),
        query: supplierListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: supplierListQueryRepository.getSortBy(),
        orderBy: supplierListQueryRepository.getOrderBy(),
        itemPerPage: supplierListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(supplierList.state).toEqual({
        type: 'loaded',
        suppliers: repository.suppliers,
        totalItem: repository.suppliers.length,
        page: supplierListQueryRepository.getPage(),
        query: supplierListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: supplierListQueryRepository.getSortBy(),
        orderBy: supplierListQueryRepository.getOrderBy(),
        itemPerPage: supplierListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to revalidating state when FETCH action is dispatched', () => {
      supplierList.dispatch({ type: 'FETCH' });
      expect(supplierList.state).toEqual({
        type: 'revalidating',
        suppliers: repository.suppliers,
        totalItem: repository.suppliers.length,
        page: supplierListQueryRepository.getPage(),
        query: supplierListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: supplierListQueryRepository.getSortBy(),
        orderBy: supplierListQueryRepository.getOrderBy(),
        itemPerPage: supplierListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(supplierList.state).toEqual({
        type: 'loaded',
        suppliers: repository.suppliers,
        totalItem: repository.suppliers.length,
        page: supplierListQueryRepository.getPage(),
        query: supplierListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: supplierListQueryRepository.getSortBy(),
        orderBy: supplierListQueryRepository.getOrderBy(),
        itemPerPage: supplierListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to changingParams state after CHANGE_PARAMS action is dispatched', () => {
      supplierList.dispatch({ type: 'CHANGE_PARAMS', page: 2 });
      expect(supplierList.state).toEqual({
        type: 'changingParams',
        suppliers: repository.suppliers,
        totalItem: repository.suppliers.length,
        page: 2,
        query: supplierListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: supplierListQueryRepository.getSortBy(),
        orderBy: supplierListQueryRepository.getOrderBy(),
        itemPerPage: supplierListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });
  });

  describe('error flow', () => {
    const supplierRepository = new MockSupplierRepository();
    supplierRepository.setShouldFail(true);
    const supplierListQueryRepository = new MockSupplierListQueryRepository();
    const usecase = new SupplierListUsecase(
      supplierRepository,
      supplierListQueryRepository,
      { suppliers: [], totalItem: 0 }
    );
    let supplierList: UsecaseTester<
      SupplierListUsecase,
      SupplierListState,
      SupplierListAction,
      SupplierListParams
    >;

    it('initialize with loading state', () => {
      supplierList = new UsecaseTester<
        SupplierListUsecase,
        SupplierListState,
        SupplierListAction,
        SupplierListParams
      >(usecase);

      expect(supplierList.state).toEqual({
        type: 'loading',
        suppliers: [],
        totalItem: 0,
        page: supplierListQueryRepository.getPage(),
        query: supplierListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: supplierListQueryRepository.getSortBy(),
        orderBy: supplierListQueryRepository.getOrderBy(),
        itemPerPage: supplierListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(supplierList.state).toEqual({
        type: 'error',
        suppliers: [],
        totalItem: 0,
        page: supplierListQueryRepository.getPage(),
        query: supplierListQueryRepository.getSearchQuery(),
        errorMessage: 'Failed to fetch suppliers',
        sortBy: supplierListQueryRepository.getSortBy(),
        orderBy: supplierListQueryRepository.getOrderBy(),
        itemPerPage: supplierListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to loading state when FETCH action is dispatched', () => {
      supplierRepository.setShouldFail(false);
      supplierList.dispatch({ type: 'FETCH' });
      expect(supplierList.state).toEqual({
        type: 'loading',
        suppliers: [],
        totalItem: 0,
        page: supplierListQueryRepository.getPage(),
        query: supplierListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: supplierListQueryRepository.getSortBy(),
        orderBy: supplierListQueryRepository.getOrderBy(),
        itemPerPage: supplierListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to loaded state after successful fetch', async () => {
      await Promise.resolve();
      expect(supplierList.state).toEqual({
        type: 'loaded',
        suppliers: supplierRepository.suppliers,
        totalItem: supplierRepository.suppliers.length,
        page: supplierListQueryRepository.getPage(),
        query: supplierListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: supplierListQueryRepository.getSortBy(),
        orderBy: supplierListQueryRepository.getOrderBy(),
        itemPerPage: supplierListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });
  });

  it('should show loaded state when initial data is given', async () => {
    const suppliers = [supplierRepository.suppliers[0]];
    const usecase = new SupplierListUsecase(
      supplierRepository,
      supplierListQueryRepository,
      { suppliers, totalItem: 1 }
    );
    const supplierList = new UsecaseTester<
      SupplierListUsecase,
      SupplierListState,
      SupplierListAction,
      SupplierListParams
    >(usecase);

    expect(supplierList.state.type).toBe('loaded');
    expect(supplierList.state.suppliers).toEqual(suppliers);
    expect(supplierList.state.totalItem).toBe(suppliers.length);
  });
});
