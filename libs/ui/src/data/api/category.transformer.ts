// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  Category as ApiCategory,
  categoryRequestStation,
} from '../../../../api-contract/src';
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
    station: categoryRequestStation.NONE,
  };
}
