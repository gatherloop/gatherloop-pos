import { z } from 'zod';

export type Budget = {
  id: number;
  name: string;
  percentage: number;
  createdAt: string;
};

export type BudgetForm = {
  name: string;
  percentage: number;
};

export const budgetFormSchema = z.object({
  name: z.string().min(1),
  percentage: z.number().min(0).max(100),
}) satisfies z.ZodType<BudgetForm>;
