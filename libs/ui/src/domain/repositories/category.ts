import { Category, CategoryForm } from '../entities';

export interface CategoryRepository {
  fetchCategoryList: () => Promise<Category[]>;

  fetchCategoryById: (categoryId: number) => Promise<Category>;

  deleteCategoryById: (categoryId: number) => Promise<void>;

  createCategory: (formValues: CategoryForm) => Promise<void>;

  updateCategory: (
    formValues: CategoryForm,
    categoryId: number
  ) => Promise<void>;
}
