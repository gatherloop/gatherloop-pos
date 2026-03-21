import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  categoryCreate,
  categoryDeleteById,
  categoryFindById,
  categoryFindByIdQueryKey,
  categoryList,
  categoryListQueryKey,
  categoryUpdateById,
} from '../../../../api-contract/src';
import { Category, CategoryRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { toApiCategory, toCategory } from './category.transformer';

export class ApiCategoryRepository implements CategoryRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchCategoryById = (
    categoryId: number,
    options?: Partial<RequestConfig>
  ) => {
    return this.client
      .fetchQuery({
        queryKey: categoryFindByIdQueryKey(categoryId),
        queryFn: () => categoryFindById(categoryId, options),
      })
      .then(({ data }) => toCategory(data));
  };

  createCategory: CategoryRepository['createCategory'] = (formValues) => {
    return categoryCreate(toApiCategory(formValues)).then();
  };

  updateCategory: CategoryRepository['updateCategory'] = (
    formValues,
    categoryId
  ) => {
    return categoryUpdateById(categoryId, toApiCategory(formValues)).then();
  };

  deleteCategoryById: CategoryRepository['deleteCategoryById'] = (
    categoryId
  ) => {
    return categoryDeleteById(categoryId).then();
  };

  fetchCategoryList = (
    options?: Partial<RequestConfig>
  ): Promise<Category[]> => {
    return this.client
      .fetchQuery({
        queryKey: categoryListQueryKey(),
        queryFn: () => categoryList(options),
      })
      .then((data) => data.data.map(toCategory));
  };
}
