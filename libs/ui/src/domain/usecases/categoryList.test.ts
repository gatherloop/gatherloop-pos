import {
  CategoryListAction,
  CategoryListState,
  CategoryListUsecase,
} from './categoryList';
import { MockCategoryRepository } from '../../data/mock';

class CategoryList {
  state: CategoryListState;

  usecase: CategoryListUsecase;

  constructor() {
    const categoryRepository = new MockCategoryRepository();
    this.usecase = new CategoryListUsecase(categoryRepository);
    this.state = this.usecase.getInitialState();
    this.usecase.onStateChange(this.state, this.dispatch);
  }

  dispatch = (action: CategoryListAction) => {
    this.state = this.usecase.getNextState(this.state, action);
    this.usecase.onStateChange(this.state, this.dispatch);
  };
}

test('should works', async () => {
  const categoryList = new CategoryList();
  expect(categoryList.state.type).toBe('loading');

  await Promise.resolve();

  expect(categoryList.state.type).toBe('loaded');
  expect(categoryList.state.categories).toEqual([
    {
      id: 1,
      createdAt: new Date().toString(),
      name: 'Mock Category',
    },
  ]);
});
