import { z } from 'zod';

export type Supplier = {
  id: number;
  name: string;
  phone?: string;
  address: string;
  mapsLink: string;
  createdAt: string;
};

export type SupplierForm = {
  name: string;
  phone?: string;
  address: string;
  mapsLink: string;
};

export const supplierFormSchema = z.object({
  name: z.string().min(1),
  phone: z.string(),
  address: z.string().min(1),
  mapsLink: z.string().min(1),
}) satisfies z.ZodType<SupplierForm>;
