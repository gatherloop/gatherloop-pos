// D6 in docs/trd-order-app-composition-and-ssr.md: the cart-item-edit
// modal's selection lives in the URL, read through this port the same way
// the item sheet reads its own selection through `MenuListQueryRepository`.
export interface CartQueryRepository {
  getSelectedItemId: () => number | null;
  setSelectedItemId: (itemId: number | null) => void;
}
