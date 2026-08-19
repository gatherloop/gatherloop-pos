// eslint-disable-next-line @nx/enforce-module-boundaries
import { Table as ApiTable } from '../../../../api-contract/src';
import { Table, TableForm } from '../../domain';

export function toTable(table: ApiTable): Table {
  return {
    id: table.id,
    code: table.code,
    label: table.label,
    floorNumber: table.floorNumber,
    createdAt: table.createdAt,
  };
}

export function toApiTable(form: TableForm) {
  return {
    label: form.label,
    floorNumber: form.floorNumber,
  };
}
