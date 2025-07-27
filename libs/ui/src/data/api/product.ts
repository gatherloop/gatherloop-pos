import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  productCreate,
  productDeleteById,
  productFindById,
  productFindByIdQueryKey,
  productList,
  ProductList200,
  productListQueryKey,
  productUpdateById,
  Product as ApiProduct,
  Category as ApiCategory,
} from '../../../../api-contract/src';
import { Category, Product, ProductRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';

export class ApiProductRepository implements ProductRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchProductById = (
    productId: number,
    options?: Partial<RequestConfig>
  ): Promise<Product> => {
    return this.client
      .fetchQuery({
        queryKey: productFindByIdQueryKey(productId),
        queryFn: () => productFindById(productId, options),
      })
      .then(({ data }) => transformers.product(data));
  };

  createProduct: ProductRepository['createProduct'] = (formValues) => {
    return productCreate({
      name: formValues.name,
      categoryId: formValues.categoryId,
      description: formValues.description,
    }).then();
  };

  updateProduct: ProductRepository['updateProduct'] = (
    formValues,
    productId
  ) => {
    return productUpdateById(productId, {
      name: formValues.name,
      categoryId: formValues.categoryId,
      description: formValues.description,
    }).then();
  };

  deleteProductById: ProductRepository['deleteProductById'] = (productId) => {
    return productDeleteById(productId).then();
  };

  getProductList: ProductRepository['getProductList'] = ({
    itemPerPage,
    orderBy,
    page,
    query,
    sortBy,
  }) => {
    const params = {
      query,
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
    };

    const res = this.client.getQueryState<ProductList200>(
      productListQueryKey(params)
    )?.data;

    this.client.removeQueries({ queryKey: productListQueryKey(params) });

    return {
      type: res?.data ? 'loaded' : 'idle',
      page: 1,
      itemPerPage: 8,
      query: '',
      sortBy: 'created_at',
      orderBy: 'desc',
      errorMessage: null,
      products: res?.data.map(transformers.product) ?? [],
      totalItem: res?.meta.total ?? 0,
    };
  };

  fetchProductList = (
    params: {
      query: string;
      page: number;
      itemPerPage: number;
      orderBy: 'asc' | 'desc';
      sortBy: 'created_at';
    },
    options?: Partial<RequestConfig>
  ) => {
    const queryParams = {
      query: params.query,
      skip: (params.page - 1) * params.itemPerPage,
      limit: params.itemPerPage,
      order: params.orderBy,
      sortBy: params.sortBy,
    };

    return this.client
      .fetchQuery({
        queryKey: productListQueryKey(queryParams),
        queryFn: () => productList(queryParams, options),
      })
      .then((data) => ({
        products: data.data.map(transformers.product),
        totalItem: data.meta.total,
      }));
  };
}

const transformers = {
  category: (category: ApiCategory): Category => ({
    id: category.id,
    name: category.name,
    createdAt: category.createdAt,
  }),
  product: (product: ApiProduct): Product => ({
    id: product.id,
    createdAt: product.createdAt,
    name: product.name,
    category: transformers.category(product.category),
    description: product.description ?? '',
  }),
};
