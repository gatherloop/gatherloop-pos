import { z } from 'zod';

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

const stockCheckItemFormSchema = z.object({
  materialId: z.number().int().positive(),
  materialName: z.string(),
  purchaseUnit: z.string(),
  currentStock: z
    .number({ invalid_type_error: 'Please enter the current stock' })
    .int()
    .min(0),
});

export const stockCheckFormSchema = z.object({
  items: z.array(stockCheckItemFormSchema),
}) satisfies z.ZodType<StockCheckForm>;
