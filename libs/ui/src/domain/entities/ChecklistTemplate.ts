import { z } from 'zod';

export type ChecklistTemplateSubItem = {
  id: number;
  name: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ChecklistTemplateItem = {
  id: number;
  name: string;
  description?: string;
  displayOrder: number;
  subItems: ChecklistTemplateSubItem[];
  createdAt: string;
  updatedAt: string;
};

export type ChecklistTemplate = {
  id: number;
  name: string;
  description?: string;
  items: ChecklistTemplateItem[];
  createdAt: string;
  updatedAt: string;
};

export type ChecklistTemplateSubItemForm = {
  name: string;
  displayOrder: number;
};

export type ChecklistTemplateItemForm = {
  name: string;
  description?: string;
  displayOrder: number;
  subItems: ChecklistTemplateSubItemForm[];
};

export type ChecklistTemplateForm = {
  name: string;
  description?: string;
  items: ChecklistTemplateItemForm[];
};

const checklistTemplateSubItemSchema = z.object({
  name: z.string().min(1, 'Sub-item name is required'),
  displayOrder: z.number(),
});

const checklistTemplateItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  displayOrder: z.number(),
  subItems: z.array(checklistTemplateSubItemSchema),
});

export const checklistTemplateFormSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  items: z
    .array(checklistTemplateItemSchema)
    .min(1, 'At least one item is required'),
}) satisfies z.ZodType<ChecklistTemplateForm>;
