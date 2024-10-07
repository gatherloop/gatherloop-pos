import { Category, CategoryForm } from '../entities';

export interface CategoryRepository {
  getCategoryByIdServerParams: () => number | null;

  getCategoryList: () => Category[];

  getCategoryById: (categoryId: number) => Category | null;

  fetchCategoryList: () => Promise<Category[]>;

  fetchCategoryById: (categoryId: number) => Promise<Category>;

  deleteCategoryById: (categoryId: number) => Promise<void>;

  createCategory: (formValues: CategoryForm) => Promise<void>;

  updateCategory: (
    formValues: CategoryForm,
    categoryId: number
  ) => Promise<void>;
}
