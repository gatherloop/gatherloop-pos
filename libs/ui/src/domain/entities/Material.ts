import { Supplier } from './Supplier';

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
  suppliers: Supplier[];
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
  supplierIds: number[];
};
