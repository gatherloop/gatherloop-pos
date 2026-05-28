export type StockCheckItem = {
  id: number;
  stockCheckId: number;
  materialId: number;
  currentStock: number;
  materialName: string;
  price: number;
  purchaseUnit: string;
  purchaseUnitSize: number;
  minimumStock: number;
  normalStock: number;
  createdAt: string;
};

export type StockCheck = {
  id: number;
  createdAt: string;
  items: StockCheckItem[];
};

export type StockCheckItemForm = {
  materialId: number;
  materialName: string;
  purchaseUnit: string;
  currentStock: number | null;
};

export type StockCheckForm = {
  items: StockCheckItemForm[];
};
