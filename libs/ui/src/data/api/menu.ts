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
} from '../../../../api-contract/src';
// Deep import, not the `domain` barrel (D20): that barrel also re-exports
// every POS usecase, which drags unrelated weight into the order bundle.
import { MenuRepository } from '../../domain/repositories/menu';
import { toCategory } from './category.transformer';
import { toProduct } from './product.transformer';
import { toVariant } from './variant.transformer';

export class ApiMenuRepository implements MenuRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchMenu: MenuRepository['fetchMenu'] = ({ query }) => {
    const productParams = { query };

    return Promise.all([
      this.client.fetchQuery({
        queryKey: publicProductListQueryKey(productParams),
        queryFn: () => publicProductList(productParams),
      }),
      this.client.fetchQuery({
        queryKey: publicCategoryListQueryKey(),
        queryFn: () => publicCategoryList(),
      }),
    ]).then(([productList, categoryList]) => ({
      products: productList.data.map(toProduct),
      categories: categoryList.data.map(toCategory),
    }));
  };

  fetchProductById: MenuRepository['fetchProductById'] = (productId) => {
    return this.client
      .fetchQuery({
        queryKey: publicProductFindByIdQueryKey(productId),
        queryFn: () => publicProductFindById(productId),
      })
      .then(({ data }) => toProduct(data));
  };

  resolveVariant: MenuRepository['resolveVariant'] = ({
    productId,
    optionValueIds,
  }) => {
    const params = { productId, optionValueIds, limit: 1 };

    return this.client
      .fetchQuery({
        queryKey: publicVariantListQueryKey(params),
        queryFn: () => publicVariantList(params),
      })
      .then(({ data }) => {
        const [variant] = data;
        if (!variant) throw new Error('Variant not found');
        return toVariant(variant);
      });
  };
}
