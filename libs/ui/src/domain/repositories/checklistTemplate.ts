import { ChecklistTemplate, ChecklistTemplateForm } from '../entities';

export interface ChecklistTemplateRepository {
  getChecklistTemplateList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
  }) => {
    checklistTemplates: ChecklistTemplate[];
    totalItem: number;
  };

  fetchChecklistTemplateList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
  }) => Promise<{ checklistTemplates: ChecklistTemplate[]; totalItem: number }>;

  fetchChecklistTemplateById: (
    checklistTemplateId: number
  ) => Promise<ChecklistTemplate>;

  deleteChecklistTemplateById: (checklistTemplateId: number) => Promise<void>;

  createChecklistTemplate: (formValues: ChecklistTemplateForm) => Promise<void>;

  updateChecklistTemplate: (
    formValues: ChecklistTemplateForm,
    checklistTemplateId: number
  ) => Promise<void>;
}
