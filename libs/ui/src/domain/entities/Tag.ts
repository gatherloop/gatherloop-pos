import { z } from 'zod';

export const tagColors = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'gray',
] as const;

export type TagColor = (typeof tagColors)[number];

export type Tag = {
  id: number;
  name: string;
  color: TagColor;
  isHighlighted: boolean;
  sortOrder: number;
  createdAt: string;
};

export type TagForm = {
  name: string;
  color: TagColor;
  isHighlighted: boolean;
  sortOrder: number;
};

export const tagFormSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.enum(tagColors),
  isHighlighted: z.boolean(),
  sortOrder: z.number().int(),
}) satisfies z.ZodType<TagForm>;
