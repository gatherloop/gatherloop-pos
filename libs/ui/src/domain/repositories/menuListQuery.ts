// D6 in docs/trd-order-app-composition-and-ssr.md: the item sheet's
// selection lives in the URL, read through this port the same way the POS
// reads list state through `ProductListQueryRepository`.
export interface MenuListQueryRepository {
  getSelectedProductId: () => number | null;
  setSelectedProductId: (productId: number | null) => void;
}
