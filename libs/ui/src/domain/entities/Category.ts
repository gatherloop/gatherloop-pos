import { z } from 'zod';

export type CategoryStation = 'KITCHEN' | 'BAR' | 'NONE';

export type Category = {
  id: number;
  name: string;
  station: CategoryStation;
  createdAt: string;
};

export type CategoryForm = {
  name: string;
  station: CategoryStation;
};

export const categoryFormSchema = z.object({
  name: z.string().min(1),
  station: z.enum(['KITCHEN', 'BAR', 'NONE']),
}) satisfies z.ZodType<CategoryForm>;
