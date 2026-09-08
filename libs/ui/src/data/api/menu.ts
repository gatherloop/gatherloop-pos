import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  publicCategoryList,
  publicCategoryListQueryKey,
  publicProductFindById,
  publicProductFindByIdQueryKey,
  publicProductList,
  publicProductListQueryKey,
  publicVariantList,
  publicVariantListQueryKey,
  type PublicVariantListQueryParams,
} from '../../../../api-contract/src';
import { RequestConfig } from '@kubb/swagger-client/client';
// Deep import, not the `domain` barrel (D20): that barrel also re-exports
// every POS usecase, which drags unrelated weight into the order bundle.
import { MenuRepository } from '../../domain/repositories/menu';
import { toCategory } from './category.transformer';
import { toProduct } from './product.transformer';
import { toVariant } from './variant.transformer';

// `withCredentials: false` (D22 in docs/prd-table-ordering.md, D3 in
// docs/trd-order-app-composition-and-ssr.md): the order app sends no auth
// cookie, and this used to be a global axios default flipped by an
// interceptor. Set per request instead, on every call this repository
// makes.
const withoutCredentials = (options?: Partial<RequestConfig>) => ({
  ...options,
  withCredentials: false,
});

export class ApiMenuRepository implements MenuRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchMenu: MenuRepository['fetchMenu'] = ({ query }, options) => {
    const productParams = { query };
    // No `limit`: the API treats an absent limit as "no limit" (mirrors how
    // /public/categories returns everything), so this stays a single
    // request for every variant of every published purchase product.
    const variantParams: PublicVariantListQueryParams = {};

    return Promise.all([
      this.client.fetchQuery({
        queryKey: publicProductListQueryKey(productParams),
        queryFn: () =>
          publicProductList(productParams, withoutCredentials(options)),
      }),
      this.client.fetchQuery({
        queryKey: publicCategoryListQueryKey(),
        queryFn: () => publicCategoryList(withoutCredentials(options)),
      }),
      this.client.fetchQuery({
        queryKey: publicVariantListQueryKey(variantParams),
        queryFn: () =>
          publicVariantList(variantParams, withoutCredentials(options)),
      }),
    ]).then(([productList, categoryList, variantList]) => ({
      products: productList.data.map(toProduct),
      categories: categoryList.data.map(toCategory),
      variants: variantList.data.map(toVariant),
    }));
  };

  fetchProductById: MenuRepository['fetchProductById'] = (
    productId,
    options
  ) => {
    return this.client
      .fetchQuery({
        queryKey: publicProductFindByIdQueryKey(productId),
        queryFn: () =>
          publicProductFindById(productId, withoutCredentials(options)),
      })
      .then(({ data }) => toProduct(data));
  };

  resolveVariant: MenuRepository['resolveVariant'] = (
    { productId, optionValueIds },
    options
  ) => {
    const params = { productId, optionValueIds, limit: 1 };

    return this.client
      .fetchQuery({
        queryKey: publicVariantListQueryKey(params),
        queryFn: () => publicVariantList(params, withoutCredentials(options)),
      })
      .then(({ data }) => {
        const [variant] = data;
        if (!variant) throw new Error('Variant not found');
        return toVariant(variant);
      });
  };
}
