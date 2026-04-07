import {
  ChecklistSession,
  ChecklistSessionForm,
  ChecklistSessionItem,
  ChecklistSessionSubItem,
} from '../entities';

export type ChecklistSessionListFilter = {
  templateId?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  status?: 'completed' | 'incomplete' | null;
};

export interface ChecklistSessionRepository {
  getChecklistSessionList: (params: {
    page: number;
    itemPerPage: number;
    filter: ChecklistSessionListFilter;
  }) => { checklistSessions: ChecklistSession[]; totalItem: number };

  fetchChecklistSessionList: (params: {
    page: number;
    itemPerPage: number;
    filter: ChecklistSessionListFilter;
  }) => Promise<{ checklistSessions: ChecklistSession[]; totalItem: number }>;

  fetchChecklistSessionById: (
    checklistSessionId: number
  ) => Promise<ChecklistSession>;

  createChecklistSession: (
    formValues: ChecklistSessionForm
  ) => Promise<ChecklistSession>;

  deleteChecklistSessionById: (checklistSessionId: number) => Promise<void>;

  checkChecklistSessionItem: (
    checklistSessionItemId: number
  ) => Promise<ChecklistSessionItem>;

  uncheckChecklistSessionItem: (
    checklistSessionItemId: number
  ) => Promise<ChecklistSessionItem>;

  checkChecklistSessionSubItem: (
    checklistSessionSubItemId: number
  ) => Promise<ChecklistSessionSubItem>;

  uncheckChecklistSessionSubItem: (
    checklistSessionSubItemId: number
  ) => Promise<ChecklistSessionSubItem>;
}
