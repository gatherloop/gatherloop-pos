import { z } from 'zod';

export type Table = {
  id: number;
  code: string;
  label: string;
  floorNumber: number;
  createdAt: string;
};

export type TableForm = {
  label: string;
  floorNumber: number;
};

export const tableFormSchema = z.object({
  label: z.string().min(1),
  floorNumber: z.number().int().min(1),
}) satisfies z.ZodType<TableForm>;
