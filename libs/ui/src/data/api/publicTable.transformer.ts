// eslint-disable-next-line @nx/enforce-module-boundaries
import { PublicTable as ApiPublicTable } from '../../../../api-contract/src';
import { PublicTable } from '../../domain/entities/PublicTable';

export function toPublicTable(table: ApiPublicTable): PublicTable {
  return {
    id: table.id,
    label: table.label,
  };
}
