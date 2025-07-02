import {
  CategoryListUsecase,
  CategoryListAction,
  CategoryListState,
  CategoryListParams,
} from './categoryList';
import { MockCategoryRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('CategoryListUsecase', () => {
  describe('success flow', () => {
    const repository = new MockCategoryRepository();
    const usecase = new CategoryListUsecase(repository, { categories: [] });
    let categoryList: UsecaseTester<
      CategoryListUsecase,
      CategoryListState,
      CategoryListAction,
      CategoryListParams
    >;

    it('initialize with loading state', () => {
      categoryList = new UsecaseTester<
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
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(categoryList.state).toEqual({
        type: 'loaded',
        categories: repository.categories,
        errorMessage: null,
      });
    });

    it('transition to revalidating state when FETCH action is dispatched', () => {
      categoryList.dispatch({ type: 'FETCH' });
      expect(categoryList.state).toEqual({
        type: 'revalidating',
        categories: repository.categories,
        errorMessage: null,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(categoryList.state).toEqual({
        type: 'loaded',
        categories: repository.categories,
        errorMessage: null,
      });
    });
  });

  describe('failed flow', () => {
    const repository = new MockCategoryRepository();
    repository.setShouldFail(true);
    const usecase = new CategoryListUsecase(repository, { categories: [] });
    let categoryList: UsecaseTester<
      CategoryListUsecase,
      CategoryListState,
      CategoryListAction,
      CategoryListParams
    >;

    it('initialize with loading state', () => {
      categoryList = new UsecaseTester<
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
    });

    it('transition to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(categoryList.state).toEqual({
        type: 'error',
        categories: [],
        errorMessage: 'Failed to fetch categories',
      });
    });

    it('transition to loading state after FETCH action is dispatched', () => {
      categoryList.dispatch({ type: 'FETCH' });
      expect(categoryList.state).toEqual({
        type: 'loading',
        categories: [],
        errorMessage: null,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      repository.setShouldFail(false);
      categoryList.dispatch({ type: 'FETCH' });
      await Promise.resolve();
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
