import { z } from 'zod';
import { Supplier } from './Supplier';

export type PurchaseType = 'online' | 'offline' | 'delivery';

export type PurchaseTypeFilter = 'all' | PurchaseType;

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
  isStockCheckRequired: boolean;
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
  isStockCheckRequired: boolean;
};

export const materialFormSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(1),
  unit: z.string().min(1),
  description: z.string(),
  purchaseUnit: z.string().min(1),
  purchaseUnitSize: z.number().positive(),
  minimumStock: z.number().int().min(0),
  normalStock: z.number().int().min(0),
  isStockCheckRequired: z.boolean(),
  suppliers: z.array(
    z
      .object({
        supplierId: z.number().min(1, 'Supplier is required'),
        purchaseType: z.enum(['online', 'offline', 'delivery']),
        purchaseUrl: z.string(),
      })
      .superRefine((val, ctx) => {
        if (val.purchaseType === 'online') {
          if (!val.purchaseUrl) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Purchase URL is required for online purchase type',
              path: ['purchaseUrl'],
            });
          } else if (!/^https?:\/\/.+/.test(val.purchaseUrl)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Purchase URL must start with http:// or https://',
              path: ['purchaseUrl'],
            });
          }
        } else if (val.purchaseUrl) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Purchase URL must be empty for non-online purchase type',
            path: ['purchaseUrl'],
          });
        }
      })
  ),
}) satisfies z.ZodType<MaterialForm>;
