import { Category, Product, Variant } from '../entities';
import { RequestConfig } from '@kubb/swagger-client/client';

// FR-5/FR-6 in docs/prd-table-ordering.md. Backed by the unauthenticated
// /public/* catalog (D1): published, purchase-only products, materials and
// pricingTiers stripped server-side (D2). One port covers both the menu
// list and the item detail sheet since both read the same public catalog.
export interface MenuRepository {
  // `variants` carries every variant of every published, purchase product in
  // one call (FR-1's /public/variants with no productId filter), so the menu
  // list can show each product's lowest price ("mulai Rp X") without an
  // N+1 fetch per card — the same "one paged fetch" spirit as D4.
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
