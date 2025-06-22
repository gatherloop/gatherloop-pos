import { CategoryRepository } from '../../domain';

export class MockCategoryRepository implements CategoryRepository {
  fetchCategoryById: CategoryRepository['fetchCategoryById'] = (
    _categoryId
  ) => {
    return Promise.resolve({
      id: 1,
      createdAt: new Date().toString(),
      name: 'Mock Category',
    });
  };

  createCategory: CategoryRepository['createCategory'] = (_formValues) => {
    return Promise.resolve();
  };

  updateCategory: CategoryRepository['updateCategory'] = (
    _formValues,
    _categoryId
  ) => {
    return Promise.resolve();
  };

  deleteCategoryById: CategoryRepository['deleteCategoryById'] = (
    _categoryId
  ) => {
    return Promise.resolve();
  };

  fetchCategoryList: CategoryRepository['fetchCategoryList'] = () => {
    return Promise.resolve([
      {
        id: 1,
        createdAt: new Date().toString(),
        name: 'Mock Category',
      },
    ]);
  };
}
