import {
  MenuListUsecase,
  MenuListAction,
  MenuListState,
  MenuListParams,
} from './menuList';
import { MockMenuRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

const createTester = (
  repository: MockMenuRepository,
  params: MenuListParams = { products: [], categories: [] }
) =>
  new UsecaseTester<
    MenuListUsecase,
    MenuListState,
    MenuListAction,
    MenuListParams
  >(new MenuListUsecase(repository, params));

describe('MenuListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → revalidating → loaded → changingParams', async () => {
      const repository = new MockMenuRepository();
      const menuList = createTester(repository);

      expect(menuList.state).toEqual({
        type: 'loading',
        products: [],
        categories: [],
        query: '',
        selectedCategoryId: null,
        errorMessage: null,
        fetchDebounceDelay: 0,
      });

      await flushPromises();
      expect(menuList.state).toEqual({
        type: 'loaded',
        products: repository.products,
        categories: repository.categories,
        query: '',
        selectedCategoryId: null,
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
        query: '',
        selectedCategoryId: null,
        errorMessage: null,
        fetchDebounceDelay: 0,
      });

      menuList.dispatch({ type: 'CHANGE_PARAMS', selectedCategoryId: 2 });
      expect(menuList.state).toEqual({
        type: 'changingParams',
        products: repository.products,
        categories: repository.categories,
        query: '',
        selectedCategoryId: 2,
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
        query: '',
        selectedCategoryId: null,
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
});
