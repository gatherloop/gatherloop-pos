import {
  CategoryListUsecase,
  CategoryListAction,
  CategoryListState,
  CategoryListParams,
} from './categoryList';
import { MockCategoryRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('CategoryListUsecase', () => {
  it('should follow the success flow', async () => {
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

    await Promise.resolve();

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

    await Promise.resolve();

    expect(categoryList.state).toEqual({
      type: 'loaded',
      categories: repository.categories,
      errorMessage: null,
    });
  });

  it('should follow the failed flow', async () => {
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

    await new Promise((resolve) => setTimeout(resolve, 0));

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

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(categoryList.state).toEqual({
      type: 'loaded',
      categories: repository.categories,
      errorMessage: null,
    });

    repository.setShouldFail(true);
    categoryList.dispatch({ type: 'FETCH' });

    expect(categoryList.state).toEqual({
      type: 'revalidating',
      categories: repository.categories,
      errorMessage: null,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(categoryList.state).toEqual({
      type: 'loaded',
      categories: repository.categories,
      errorMessage: null,
    });
  });

  it('should show loaded state when data initial data is given', async () => {
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
