export type PurchaseType = 'offline' | 'online' | 'delivery';

export type MaterialSupplier = {
  supplierId: number;
  supplierName: string;
  address: string;
  phone: string;
  purchaseType: PurchaseType;
  purchaseUrl: string;
};

export type MaterialSupplierInput = {
  supplierId: number;
  purchaseType: PurchaseType;
  purchaseUrl: string;
};

export type Material = {
  id: number;
  name: string;
  price: number;
  unit: string;
  description?: string;
  weeklyUsage: number;
  purchaseUnit: string;
  purchaseUnitSize: number;
  minimumStock: number;
  normalStock: number;
  suppliers: MaterialSupplier[];
  createdAt: string;
};

export type MaterialForm = {
  name: string;
  price: number;
  unit: string;
  description?: string;
  purchaseUnit: string;
  purchaseUnitSize: number;
  minimumStock: number;
  normalStock: number;
  suppliers: MaterialSupplierInput[];
};
