import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  categoryCreate,
  categoryDeleteById,
  categoryFindById,
  CategoryFindById200,
  categoryFindByIdQueryKey,
  categoryList,
  CategoryList200,
  categoryListQueryKey,
  categoryUpdateById,
  Category as ApiCategory,
} from '../../../../api-contract/src';
import { Category, CategoryRepository } from '../../domain';

export class ApiCategoryRepository implements CategoryRepository {
  client: QueryClient;

  categoryByIdServerParams: number | null = null;

  constructor(client: QueryClient) {
    this.client = client;
  }

  getCategoryById: CategoryRepository['getCategoryById'] = (categoryId) => {
    const res = this.client.getQueryState<CategoryFindById200>(
      categoryFindByIdQueryKey(categoryId)
    )?.data;

    this.client.removeQueries({
      queryKey: categoryFindByIdQueryKey(categoryId),
    });

    return res ? transformers.category(res.data) : null;
  };

  getCategoryByIdServerParams: CategoryRepository['getCategoryByIdServerParams'] =
    () => this.categoryByIdServerParams;

  fetchCategoryById: CategoryRepository['fetchCategoryById'] = (categoryId) => {
    return this.client
      .fetchQuery({
        queryKey: categoryFindByIdQueryKey(categoryId),
        queryFn: () => categoryFindById(categoryId),
      })
      .then(({ data }) => transformers.category(data));
  };

  createCategory: CategoryRepository['createCategory'] = (formValues) => {
    return categoryCreate(formValues).then();
  };

  updateCategory: CategoryRepository['updateCategory'] = (
    formValues,
    categoryId
  ) => {
    return categoryUpdateById(categoryId, formValues).then();
  };

  deleteCategoryById: CategoryRepository['deleteCategoryById'] = (
    categoryId
  ) => {
    return categoryDeleteById(categoryId).then();
  };

  getCategoryList: CategoryRepository['getCategoryList'] = () => {
    const res = this.client.getQueryState<CategoryList200>(
      categoryListQueryKey()
    )?.data;

    this.client.removeQueries({ queryKey: categoryListQueryKey() });

    return res?.data.map(transformers.category) ?? [];
  };

  fetchCategoryList: CategoryRepository['fetchCategoryList'] = () => {
    return this.client
      .fetchQuery({
        queryKey: categoryListQueryKey(),
        queryFn: () => categoryList(),
      })
      .then((data) => data.data.map(transformers.category));
  };
}

const transformers = {
  category: (category: ApiCategory): Category => ({
    id: category.id,
    createdAt: category.createdAt,
    name: category.name,
  }),
};
