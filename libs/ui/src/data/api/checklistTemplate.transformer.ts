// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  ChecklistTemplate as ApiChecklistTemplate,
  ChecklistTemplateItem as ApiChecklistTemplateItem,
  ChecklistTemplateSubItem as ApiChecklistTemplateSubItem,
  ChecklistTemplateRequest,
} from '../../../../api-contract/src';
import {
  ChecklistTemplate,
  ChecklistTemplateForm,
  ChecklistTemplateItem,
  ChecklistTemplateSubItem,
} from '../../domain';

export function toChecklistTemplateSubItem(
  sub: ApiChecklistTemplateSubItem
): ChecklistTemplateSubItem {
  return {
    id: sub.id,
    name: sub.name,
    displayOrder: sub.displayOrder,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  };
}

export function toChecklistTemplateItem(
  item: ApiChecklistTemplateItem
): ChecklistTemplateItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    displayOrder: item.displayOrder,
    subItems: item.subItems.map(toChecklistTemplateSubItem),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function toChecklistTemplate(
  t: ApiChecklistTemplate
): ChecklistTemplate {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    items: t.items.map(toChecklistTemplateItem),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function toApiChecklistTemplate(
  form: ChecklistTemplateForm
): ChecklistTemplateRequest {
  return {
    name: form.name,
    description: form.description,
    items: form.items.map((item) => ({
      name: item.name,
      description: item.description,
      displayOrder: item.displayOrder,
      subItems: item.subItems.map((sub) => ({
        name: sub.name,
        displayOrder: sub.displayOrder,
      })),
    })),
  };
}
