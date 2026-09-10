export interface MenuListQueryRepository {
  getSelectedProductId: () => number | null;
  setSelectedProductId: (productId: number | null) => void;
}
