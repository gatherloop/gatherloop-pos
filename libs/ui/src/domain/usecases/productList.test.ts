import {
  ProductListUsecase,
  ProductListAction,
  ProductListState,
  ProductListParams,
} from './productList';
import {
  MockProductRepository,
  MockProductListQueryRepository,
} from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('ProductListUsecase', () => {
  let productRepository: MockProductRepository;
  let productListQueryRepository: MockProductListQueryRepository;

  beforeEach(() => {
    productRepository = new MockProductRepository();
    productListQueryRepository = new MockProductListQueryRepository();
  });

  describe('success flow', () => {
    const repository = new MockProductRepository();
    const productListQueryRepository = new MockProductListQueryRepository();
    const usecase = new ProductListUsecase(
      repository,
      productListQueryRepository,
      { products: [], totalItem: 0 }
    );

    let productList: UsecaseTester<
      ProductListUsecase,
      ProductListState,
      ProductListAction,
      ProductListParams
    >;

    it('initialize with loading state', () => {
      productList = new UsecaseTester<
        ProductListUsecase,
        ProductListState,
        ProductListAction,
        ProductListParams
      >(usecase);

      expect(productList.state).toEqual({
        type: 'loading',
        products: [],
        totalItem: 0,
        page: productListQueryRepository.getPage(),
        query: productListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: productListQueryRepository.getSortBy(),
        orderBy: productListQueryRepository.getOrderBy(),
        saleType: productListQueryRepository.getSaleType(),
        itemPerPage: productListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(productList.state).toEqual({
        type: 'loaded',
        products: repository.products,
        totalItem: repository.products.length,
        page: productListQueryRepository.getPage(),
        query: productListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: productListQueryRepository.getSortBy(),
        orderBy: productListQueryRepository.getOrderBy(),
        saleType: productListQueryRepository.getSaleType(),
        itemPerPage: productListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to revalidating state when FETCH action is dispatched', () => {
      productList.dispatch({ type: 'FETCH' });
      expect(productList.state).toEqual({
        type: 'revalidating',
        products: repository.products,
        totalItem: repository.products.length,
        page: productListQueryRepository.getPage(),
        query: productListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: productListQueryRepository.getSortBy(),
        orderBy: productListQueryRepository.getOrderBy(),
        saleType: productListQueryRepository.getSaleType(),
        itemPerPage: productListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(productList.state).toEqual({
        type: 'loaded',
        products: repository.products,
        totalItem: repository.products.length,
        page: productListQueryRepository.getPage(),
        query: productListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: productListQueryRepository.getSortBy(),
        orderBy: productListQueryRepository.getOrderBy(),
        saleType: productListQueryRepository.getSaleType(),
        itemPerPage: productListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to changingParams state after CHANGE_PARAMS action is dispatched', () => {
      productList.dispatch({ type: 'CHANGE_PARAMS', page: 2 });
      expect(productList.state).toEqual({
        type: 'changingParams',
        products: repository.products,
        totalItem: repository.products.length,
        page: 2,
        query: productListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: productListQueryRepository.getSortBy(),
        orderBy: productListQueryRepository.getOrderBy(),
        saleType: productListQueryRepository.getSaleType(),
        itemPerPage: productListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });
  });

  describe('error flow', () => {
    const productRepository = new MockProductRepository();
    productRepository.setShouldFail(true);
    const productListQueryRepository = new MockProductListQueryRepository();
    const usecase = new ProductListUsecase(
      productRepository,
      productListQueryRepository,
      { products: [], totalItem: 0 }
    );
    let productList: UsecaseTester<
      ProductListUsecase,
      ProductListState,
      ProductListAction,
      ProductListParams
    >;

    it('initialize with loading state', () => {
      productList = new UsecaseTester<
        ProductListUsecase,
        ProductListState,
        ProductListAction,
        ProductListParams
      >(usecase);

      expect(productList.state).toEqual({
        type: 'loading',
        products: [],
        totalItem: 0,
        page: productListQueryRepository.getPage(),
        query: productListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: productListQueryRepository.getSortBy(),
        orderBy: productListQueryRepository.getOrderBy(),
        saleType: productListQueryRepository.getSaleType(),
        itemPerPage: productListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(productList.state).toEqual({
        type: 'error',
        products: [],
        totalItem: 0,
        page: productListQueryRepository.getPage(),
        query: productListQueryRepository.getSearchQuery(),
        errorMessage: 'Failed to fetch products',
        sortBy: productListQueryRepository.getSortBy(),
        orderBy: productListQueryRepository.getOrderBy(),
        saleType: productListQueryRepository.getSaleType(),
        itemPerPage: productListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to loading state when FETCH action is dispatched', () => {
      productRepository.setShouldFail(false);
      productList.dispatch({ type: 'FETCH' });
      expect(productList.state).toEqual({
        type: 'loading',
        products: [],
        totalItem: 0,
        page: productListQueryRepository.getPage(),
        query: productListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: productListQueryRepository.getSortBy(),
        orderBy: productListQueryRepository.getOrderBy(),
        saleType: productListQueryRepository.getSaleType(),
        itemPerPage: productListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to loaded state after successful fetch', async () => {
      await Promise.resolve();
      expect(productList.state).toEqual({
        type: 'loaded',
        products: productRepository.products,
        totalItem: productRepository.products.length,
        page: productListQueryRepository.getPage(),
        query: productListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: productListQueryRepository.getSortBy(),
        orderBy: productListQueryRepository.getOrderBy(),
        saleType: productListQueryRepository.getSaleType(),
        itemPerPage: productListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });
  });

  it('should show loaded state when initial data is given', async () => {
    const products = [productRepository.products[0]];
    const usecase = new ProductListUsecase(
      productRepository,
      productListQueryRepository,
      { products, totalItem: 1 }
    );
    const productList = new UsecaseTester<
      ProductListUsecase,
      ProductListState,
      ProductListAction,
      ProductListParams
    >(usecase);

    expect(productList.state.type).toBe('loaded');
    expect(productList.state.products).toEqual(products);
    expect(productList.state.totalItem).toBe(products.length);
  });
});
