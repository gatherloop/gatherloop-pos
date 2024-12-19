import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  productCreate,
  productDeleteById,
  productFindById,
  ProductFindById200,
  productFindByIdQueryKey,
  productList,
  ProductList200,
  productListQueryKey,
  productUpdateById,
  Product as ApiProduct,
  Category as ApiCategory,
} from '../../../../api-contract/src';
import {
  Category,
  Product,
  ProductListParams,
  ProductRepository,
} from '../../domain';

export class OpenAPIProductRepository implements ProductRepository {
  client: QueryClient;

  productListServerParams: ProductListParams = {
    page: 1,
    itemPerPage: 8,
    orderBy: 'desc',
    query: '',
    sortBy: 'created_at',
  };

  productByIdServerParams: number | null = null;

  constructor(client: QueryClient) {
    this.client = client;
  }

  getProductById: ProductRepository['getProductById'] = (productId) => {
    const res = this.client.getQueryState<ProductFindById200>(
      productFindByIdQueryKey(productId)
    )?.data;

    this.client.removeQueries({ queryKey: productFindByIdQueryKey(productId) });

    return res ? transformers.product(res.data) : null;
  };

  getProductListServerParams: ProductRepository['getProductListServerParams'] =
    () => this.productListServerParams;

  getProductByIdServerParams: ProductRepository['getProductByIdServerParams'] =
    () => this.productByIdServerParams;

  fetchProductById: ProductRepository['fetchProductById'] = (productId) => {
    return this.client
      .fetchQuery({
        queryKey: productFindByIdQueryKey(productId),
        queryFn: () => productFindById(productId),
      })
      .then(({ data }) => transformers.product(data));
  };

  createProduct: ProductRepository['createProduct'] = (formValues) => {
    return productCreate({
      name: formValues.name,
      categoryId: formValues.categoryId,
      price: formValues.price,
      materials: formValues.materials.map(({ material, amount }) => ({
        amount,
        materialId: material.id,
      })),
    }).then();
  };

  updateProduct: ProductRepository['updateProduct'] = (
    formValues,
    productId
  ) => {
    return productUpdateById(productId, {
      name: formValues.name,
      categoryId: formValues.categoryId,
      price: formValues.price,
      materials: formValues.materials.map(({ material, amount }) => ({
        amount,
        materialId: material.id,
      })),
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

  fetchProductList: ProductRepository['fetchProductList'] = ({
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

    return this.client
      .fetchQuery({
        queryKey: productListQueryKey(params),
        queryFn: () => productList(params),
      })
      .then((data) => ({
        products: data.data.map(transformers.product),
        totalItem: data.meta.total,
      }));
  };
}

export const transformers = {
  category: (category: ApiCategory): Category => ({
    id: category.id,
    name: category.name,
    createdAt: category.createdAt,
  }),
  product: (product: ApiProduct): Product => ({
    id: product.id,
    createdAt: product.createdAt,
    name: product.name,
    price: product.price,
    category: transformers.category(product.category),
    materials: product.materials.map<Product['materials'][number]>(
      ({ amount, material }) => ({
        materialId: material.id,
        material: {
          id: material.id,
          name: material.name,
          price: material.price,
          unit: material.unit,
          createdAt: material.createdAt,
        },
        amount,
      })
    ),
  }),
};
