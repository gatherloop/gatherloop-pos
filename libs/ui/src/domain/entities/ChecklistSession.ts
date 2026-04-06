import { ChecklistTemplate } from './ChecklistTemplate';

export type ChecklistSessionSubItem = {
  id: number;
  checklistSessionItemId: number;
  checklistTemplateSubItemId?: number;
  name: string;
  displayOrder: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ChecklistSessionItem = {
  id: number;
  checklistSessionId: number;
  checklistTemplateItemId?: number;
  name: string;
  description?: string;
  displayOrder: number;
  completedAt?: string;
  subItems: ChecklistSessionSubItem[];
  createdAt: string;
  updatedAt: string;
};

export type ChecklistSession = {
  id: number;
  checklistTemplateId: number;
  checklistTemplate?: ChecklistTemplate;
  date: string;
  completedAt?: string;
  items: ChecklistSessionItem[];
  createdAt: string;
  updatedAt: string;
};

export type ChecklistSessionForm = {
  checklistTemplateId: number;
  date: string;
};
