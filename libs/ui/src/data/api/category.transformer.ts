// eslint-disable-next-line @nx/enforce-module-boundaries
import { Category as ApiCategory } from '../../../../api-contract/src';
import { Category, CategoryForm } from '../../domain';

export function toCategory(category: ApiCategory): Category {
  return {
    id: category.id,
    createdAt: category.createdAt,
    name: category.name,
  };
}

export function toApiCategory(form: CategoryForm) {
  return {
    name: form.name,
  };
}
