import { Category, Product, Variant } from '../entities';

// FR-5/FR-6 in docs/prd-table-ordering.md. Backed by the unauthenticated
// /public/* catalog (D1): published, purchase-only products, materials and
// pricingTiers stripped server-side (D2). One port covers both the menu
// list and the item detail sheet since both read the same public catalog.
export interface MenuRepository {
  fetchMenu: (params: { query: string }) => Promise<{
    products: Product[];
    categories: Category[];
  }>;

  fetchProductById: (productId: number) => Promise<Product>;

  resolveVariant: (params: {
    productId: number;
    optionValueIds: number[];
  }) => Promise<Variant>;
}
