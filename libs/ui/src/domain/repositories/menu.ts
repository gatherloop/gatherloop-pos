import { Category, Product, Variant } from '../entities';
import { RequestConfig } from '@kubb/swagger-client/client';

export interface MenuRepository {
  fetchMenu: (
    params: { query: string },
    options?: Partial<RequestConfig>
  ) => Promise<{
    products: Product[];
    categories: Category[];
    variants: Variant[];
  }>;

  fetchProductById: (
    productId: number,
    options?: Partial<RequestConfig>
  ) => Promise<Product>;

  resolveVariant: (
    params: {
      productId: number;
      optionValueIds: number[];
    },
    options?: Partial<RequestConfig>
  ) => Promise<Variant>;
}
