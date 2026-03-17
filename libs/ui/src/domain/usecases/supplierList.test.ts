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
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('SupplierListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → revalidating → loaded → changingParams', async () => {
      const repository = new MockSupplierRepository();
      const supplierListQueryRepository = new MockSupplierListQueryRepository();
      const usecase = new SupplierListUsecase(
        repository,
        supplierListQueryRepository,
        { suppliers: [], totalItem: 0 }
      );

      const supplierList = new UsecaseTester<
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

      await flushPromises();
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

      await flushPromises();
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
    it('should transition loading → error → loading → loaded', async () => {
      const supplierRepository = new MockSupplierRepository();
      supplierRepository.setShouldFail(true);
      const supplierListQueryRepository = new MockSupplierListQueryRepository();
      const usecase = new SupplierListUsecase(
        supplierRepository,
        supplierListQueryRepository,
        { suppliers: [], totalItem: 0 }
      );

      const supplierList = new UsecaseTester<
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

      await flushPromises();
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

      await flushPromises();
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
    const supplierRepository = new MockSupplierRepository();
    const supplierListQueryRepository = new MockSupplierListQueryRepository();
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
