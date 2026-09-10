import {
  MenuListUsecase,
  MenuListAction,
  MenuListState,
  MenuListParams,
} from './menuList';
import { MockMenuListQueryRepository, MockMenuRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

const createTester = (
  repository: MockMenuRepository,
  params: MenuListParams = { products: [], categories: [] },
  queryRepository: MockMenuListQueryRepository = new MockMenuListQueryRepository()
) =>
  new UsecaseTester<
    MenuListUsecase,
    MenuListState,
    MenuListAction,
    MenuListParams
  >(new MenuListUsecase(repository, queryRepository, params));

describe('MenuListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → revalidating → loaded → changingParams', async () => {
      const repository = new MockMenuRepository();
      const menuList = createTester(repository);

      expect(menuList.state).toEqual({
        type: 'loading',
        products: [],
        categories: [],
        variants: [],
        query: '',
        selectedCategoryId: null,
        selectedProductId: null,
        errorMessage: null,
        fetchDebounceDelay: 0,
      });

      await flushPromises();
      expect(menuList.state).toEqual({
        type: 'loaded',
        products: repository.products,
        categories: repository.categories,
        variants: repository.variants,
        query: '',
        selectedCategoryId: null,
        selectedProductId: null,
        errorMessage: null,
        fetchDebounceDelay: 0,
      });

      menuList.dispatch({ type: 'FETCH' });
      expect(menuList.state.type).toBe('revalidating');

      await flushPromises();
      expect(menuList.state).toEqual({
        type: 'loaded',
        products: repository.products,
        categories: repository.categories,
        variants: repository.variants,
        query: '',
        selectedCategoryId: null,
        selectedProductId: null,
        errorMessage: null,
        fetchDebounceDelay: 0,
      });

      menuList.dispatch({ type: 'CHANGE_PARAMS', selectedCategoryId: 2 });
      expect(menuList.state).toEqual({
        type: 'changingParams',
        products: repository.products,
        categories: repository.categories,
        variants: repository.variants,
        query: '',
        selectedCategoryId: 2,
        selectedProductId: null,
        errorMessage: null,
        fetchDebounceDelay: 0,
      });
    });

    it('should revalidate through the network when params change', async () => {
      const repository = new MockMenuRepository();
      const fetchSpy = jest.spyOn(repository, 'fetchMenu');
      const menuList = createTester(repository);

      await flushPromises();
      expect(menuList.state.type).toBe('loaded');
      fetchSpy.mockClear();

      menuList.dispatch({ type: 'CHANGE_PARAMS', query: 'kopi' });
      expect(menuList.state.type).toBe('changingParams');
      expect(menuList.state.query).toBe('kopi');

      await flushPromises();
      await flushPromises();
      expect(fetchSpy).toHaveBeenCalledWith({ query: 'kopi' });
      expect(menuList.state.type).toBe('loaded');
      expect(menuList.state.products).toEqual([repository.products[0]]);
    });
  });

  describe('error flow', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockMenuRepository();
      repository.setShouldFail(true);
      const menuList = createTester(repository);

      expect(menuList.state.type).toBe('loading');

      await flushPromises();
      expect(menuList.state).toEqual({
        type: 'error',
        products: [],
        categories: [],
        variants: [],
        query: '',
        selectedCategoryId: null,
        selectedProductId: null,
        errorMessage: 'Failed to fetch menu',
        fetchDebounceDelay: 0,
      });

      repository.setShouldFail(false);
      menuList.dispatch({ type: 'FETCH' });
      expect(menuList.state.type).toBe('loading');
      expect(menuList.state.errorMessage).toBeNull();

      await flushPromises();
      expect(menuList.state.type).toBe('loaded');
      expect(menuList.state.products).toEqual(repository.products);
    });

    it('keeps the stale menu when a revalidation fails', async () => {
      const repository = new MockMenuRepository();
      const menuList = createTester(repository);

      await flushPromises();
      expect(menuList.state.type).toBe('loaded');
      const loadedProducts = menuList.state.products;

      repository.setShouldFail(true);
      menuList.dispatch({ type: 'FETCH' });
      expect(menuList.state.type).toBe('revalidating');

      await flushPromises();
      expect(menuList.state.type).toBe('loaded');
      expect(menuList.state.products).toEqual(loadedProducts);
    });
  });

  it('should show loaded state when initial data is given', () => {
    const repository = new MockMenuRepository();
    const products = [repository.products[0]];
    const categories = [repository.categories[0]];
    const menuList = createTester(repository, { products, categories });

    expect(menuList.state.type).toBe('loaded');
    expect(menuList.state.products).toEqual(products);
    expect(menuList.state.categories).toEqual(categories);
  });

  describe('item selection', () => {
    it('holds the selected product id, from any fetch state, without changing it', async () => {
      const repository = new MockMenuRepository();
      const menuList = createTester(repository);
      await flushPromises();

      menuList.dispatch({ type: 'SELECT_ITEM', productId: 1 });

      expect(menuList.state.type).toBe('loaded');
      expect(menuList.state.selectedProductId).toBe(1);
    });

    it('clears the selected product id', async () => {
      const repository = new MockMenuRepository();
      const menuList = createTester(repository);
      await flushPromises();

      menuList.dispatch({ type: 'SELECT_ITEM', productId: 1 });
      menuList.dispatch({ type: 'CLEAR_ITEM' });

      expect(menuList.state.selectedProductId).toBeNull();
    });

    it('reads the initial selection from the query repository when the params do not seed one', () => {
      const repository = new MockMenuRepository();
      const queryRepository = new MockMenuListQueryRepository();
      jest.spyOn(queryRepository, 'getSelectedProductId').mockReturnValue(5);

      const menuList = createTester(
        repository,
        { products: [], categories: [] },
        queryRepository
      );

      expect(menuList.state.selectedProductId).toBe(5);
    });

    it('prefers a seeded selectedProductId param over the query repository', () => {
      const repository = new MockMenuRepository();
      const queryRepository = new MockMenuListQueryRepository();
      jest.spyOn(queryRepository, 'getSelectedProductId').mockReturnValue(5);

      const menuList = createTester(
        repository,
        { products: [], categories: [], selectedProductId: 9 },
        queryRepository
      );

      expect(menuList.state.selectedProductId).toBe(9);
    });

    it('mirrors a selection into the query repository', async () => {
      const repository = new MockMenuRepository();
      const queryRepository = new MockMenuListQueryRepository();
      const setSpy = jest.spyOn(queryRepository, 'setSelectedProductId');
      const menuList = createTester(repository, undefined, queryRepository);
      await flushPromises();
      setSpy.mockClear();

      menuList.dispatch({ type: 'SELECT_ITEM', productId: 3 });

      expect(setSpy).toHaveBeenCalledWith(3);
    });

    it('does not re-write the query repository on unrelated state changes', async () => {
      const repository = new MockMenuRepository();
      const queryRepository = new MockMenuListQueryRepository();
      jest.spyOn(queryRepository, 'getSelectedProductId').mockReturnValue(3);
      const setSpy = jest.spyOn(queryRepository, 'setSelectedProductId');
      const menuList = createTester(repository, undefined, queryRepository);
      await flushPromises();
      setSpy.mockClear();

      menuList.dispatch({ type: 'CHANGE_PARAMS', query: 'kopi' });

      expect(setSpy).not.toHaveBeenCalled();
    });
  });
});
