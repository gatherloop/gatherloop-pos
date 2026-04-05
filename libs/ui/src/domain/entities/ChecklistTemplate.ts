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
