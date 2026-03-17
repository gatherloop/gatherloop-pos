import {
  CategoryListUsecase,
  CategoryListAction,
  CategoryListState,
  CategoryListParams,
} from './categoryList';
import { MockCategoryRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('CategoryListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → revalidating → loaded', async () => {
      const repository = new MockCategoryRepository();
      const usecase = new CategoryListUsecase(repository, { categories: [] });
      const categoryList = new UsecaseTester<
        CategoryListUsecase,
        CategoryListState,
        CategoryListAction,
        CategoryListParams
      >(usecase);

      expect(categoryList.state).toEqual({
        type: 'loading',
        categories: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(categoryList.state).toEqual({
        type: 'loaded',
        categories: repository.categories,
        errorMessage: null,
      });

      categoryList.dispatch({ type: 'FETCH' });
      expect(categoryList.state).toEqual({
        type: 'revalidating',
        categories: repository.categories,
        errorMessage: null,
      });

      await flushPromises();
      expect(categoryList.state).toEqual({
        type: 'loaded',
        categories: repository.categories,
        errorMessage: null,
      });
    });
  });

  describe('failed flow', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockCategoryRepository();
      repository.setShouldFail(true);
      const usecase = new CategoryListUsecase(repository, { categories: [] });
      const categoryList = new UsecaseTester<
        CategoryListUsecase,
        CategoryListState,
        CategoryListAction,
        CategoryListParams
      >(usecase);

      expect(categoryList.state).toEqual({
        type: 'loading',
        categories: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(categoryList.state).toEqual({
        type: 'error',
        categories: [],
        errorMessage: 'Failed to fetch categories',
      });

      repository.setShouldFail(false);
      categoryList.dispatch({ type: 'FETCH' });
      expect(categoryList.state).toEqual({
        type: 'loading',
        categories: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(categoryList.state).toEqual({
        type: 'loaded',
        categories: repository.categories,
        errorMessage: null,
      });
    });
  });

  it('show loaded state when initial data is given', async () => {
    const repository = new MockCategoryRepository();

    const categories = [
      { id: 1, name: 'Category Test 1', createdAt: new Date().toISOString() },
    ];

    const usecase = new CategoryListUsecase(repository, { categories });

    const categoryList = new UsecaseTester<
      CategoryListUsecase,
      CategoryListState,
      CategoryListAction,
      CategoryListParams
    >(usecase);

    expect(categoryList.state).toEqual({
      type: 'loaded',
      categories,
      errorMessage: null,
    });
  });
});
