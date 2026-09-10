export interface CartQueryRepository {
  getSelectedItemId: () => number | null;
  setSelectedItemId: (itemId: number | null) => void;
}
