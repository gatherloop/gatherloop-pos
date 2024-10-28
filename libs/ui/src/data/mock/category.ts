import { CategoryRepository } from '../../domain';

export class MockCategoryRepository implements CategoryRepository {
  getCategoryById: CategoryRepository['getCategoryById'] = (_categoryId) => {
    return {
      id: 1,
      createdAt: new Date().toString(),
      name: 'Mock Category',
    };
  };

  getCategoryByIdServerParams: CategoryRepository['getCategoryByIdServerParams'] =
    () => null;

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

  getCategoryList: CategoryRepository['getCategoryList'] = () => {
    return [];
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
