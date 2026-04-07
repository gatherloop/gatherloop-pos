import { ChecklistTemplate } from './ChecklistTemplate';

export type ChecklistSessionSubItem = {
  id: number;
  checklistSessionItemId: number;
  checklistTemplateSubItemId: number | null;
  name: string;
  displayOrder: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChecklistSessionItem = {
  id: number;
  checklistSessionId: number;
  checklistTemplateItemId: number | null;
  name: string;
  description: string | null;
  displayOrder: number;
  completedAt: string | null;
  subItems: ChecklistSessionSubItem[];
  createdAt: string;
  updatedAt: string;
};

export type ChecklistSession = {
  id: number;
  checklistTemplateId: number;
  checklistTemplate: ChecklistTemplate | null;
  date: string;
  completedAt: string | null;
  items: ChecklistSessionItem[];
  createdAt: string;
  updatedAt: string;
};

export type ChecklistSessionForm = {
  checklistTemplateId: number;
  date: string;
};
