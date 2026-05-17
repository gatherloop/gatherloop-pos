import { MaterialSupplier, MaterialSupplierInput } from './MaterialSupplier';

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
  materialSuppliers: MaterialSupplier[];
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
  materialSuppliers: MaterialSupplierInput[];
};
