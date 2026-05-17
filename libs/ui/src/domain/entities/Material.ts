import { Supplier } from './Supplier';

export type PurchaseType = 'online' | 'offline' | 'delivery';

export type MaterialSupplier = {
  id: number;
  supplierId: number;
  purchaseType: PurchaseType;
  purchaseUrl: string;
  supplier: Supplier;
};

export type MaterialSupplierForm = {
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
  suppliers: MaterialSupplierForm[];
};
