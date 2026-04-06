import {
  ChecklistSession,
  ChecklistSessionForm,
  ChecklistSessionItem,
  ChecklistSessionSubItem,
} from '../entities';

export interface ChecklistSessionRepository {
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
