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
} from '../../../../api-contract/src';
import { Product, ProductRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { toApiProduct, toProduct } from './product.transformer';

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
      .then(({ data }) => toProduct(data));
  };

  createProduct: ProductRepository['createProduct'] = (formValues) => {
    return productCreate(toApiProduct(formValues)).then();
  };

  updateProduct: ProductRepository['updateProduct'] = (
    formValues,
    productId
  ) => {
    return productUpdateById(productId, toApiProduct(formValues)).then();
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
    saleType,
  }) => {
    const params = {
      query,
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
      saleType,
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
      products: res?.data.map(toProduct) ?? [],
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
      saleType: 'purchase' | 'rental' | 'all';
    },
    options?: Partial<RequestConfig>
  ) => {
    const queryParams = {
      query: params.query,
      skip: (params.page - 1) * params.itemPerPage,
      limit: params.itemPerPage,
      order: params.orderBy,
      sortBy: params.sortBy,
      saleType: params.saleType,
    };

    return this.client
      .fetchQuery({
        queryKey: productListQueryKey(queryParams),
        queryFn: () => productList(queryParams, options),
      })
      .then((data) => ({
        products: data.data.map(toProduct),
        totalItem: data.meta.total,
      }));
  };
}
