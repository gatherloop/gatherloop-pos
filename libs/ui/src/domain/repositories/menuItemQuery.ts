export interface MenuItemQueryRepository {
  getSelectedProductId: () => number | null;
  setSelectedProductId: (productId: number | null) => void;
}
