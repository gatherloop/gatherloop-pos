// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  ChecklistSession as ApiChecklistSession,
  ChecklistSessionItem as ApiChecklistSessionItem,
  ChecklistSessionSubItem as ApiChecklistSessionSubItem,
  ChecklistSessionRequest,
} from '../../../../api-contract/src';
import {
  ChecklistSession,
  ChecklistSessionForm,
  ChecklistSessionItem,
  ChecklistSessionSubItem,
} from '../../domain';
import { toChecklistTemplate } from './checklistTemplate.transformer';

export function toChecklistSessionSubItem(
  sub: ApiChecklistSessionSubItem
): ChecklistSessionSubItem {
  return {
    id: sub.id,
    checklistSessionItemId: sub.checklistSessionItemId,
    checklistTemplateSubItemId: sub.checklistTemplateSubItemId ?? null,
    name: sub.name,
    displayOrder: sub.displayOrder,
    completedAt: sub.completedAt ?? null,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  };
}

export function toChecklistSessionItem(
  item: ApiChecklistSessionItem
): ChecklistSessionItem {
  return {
    id: item.id,
    checklistSessionId: item.checklistSessionId,
    checklistTemplateItemId: item.checklistTemplateItemId ?? null,
    name: item.name,
    description: item.description ?? null,
    displayOrder: item.displayOrder,
    completedAt: item.completedAt ?? null,
    subItems: item.subItems.map(toChecklistSessionSubItem),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function toChecklistSession(s: ApiChecklistSession): ChecklistSession {
  return {
    id: s.id,
    checklistTemplateId: s.checklistTemplateId,
    checklistTemplate: s.checklistTemplate
      ? toChecklistTemplate(s.checklistTemplate)
      : null,
    date: s.date,
    completedAt: s.completedAt ?? null,
    items: s.items.map(toChecklistSessionItem),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export function toApiChecklistSession(
  form: ChecklistSessionForm
): ChecklistSessionRequest {
  return {
    checklistTemplateId: form.checklistTemplateId,
    date: form.date,
  };
}
