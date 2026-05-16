export type PurchaseListItem = {
  materialId: number;
  materialName: string;
  currentStock: number;
  minimumStock: number;
  normalStock: number;
  purchaseUnit: string;
  purchaseUnitSize: number;
  purchaseQuantity: number;
  estimatedCost: number;
};

export type PurchaseList = {
  stockCheckId: number;
  stockCheckDate: string;
  totalEstimatedCost: number;
  items: PurchaseListItem[];
};
