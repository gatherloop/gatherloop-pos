import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  tableCreate,
  tableDeleteById,
  tableFindById,
  tableFindByIdQueryKey,
  tableList,
  tableListQueryKey,
  tableRegenerateCode,
  tableUpdateById,
} from '../../../../api-contract/src';
import { Table, TableRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { toApiTable, toTable } from './table.transformer';

export class ApiTableRepository implements TableRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchTableById = (tableId: number, options?: Partial<RequestConfig>) => {
    return this.client
      .fetchQuery({
        queryKey: tableFindByIdQueryKey(tableId),
        queryFn: () => tableFindById(tableId, options),
      })
      .then(({ data }) => toTable(data));
  };

  createTable: TableRepository['createTable'] = (formValues) => {
    return tableCreate(toApiTable(formValues)).then();
  };

  updateTable: TableRepository['updateTable'] = (formValues, tableId) => {
    return tableUpdateById(tableId, toApiTable(formValues)).then();
  };

  deleteTableById: TableRepository['deleteTableById'] = (tableId) => {
    return tableDeleteById(tableId).then();
  };

  regenerateTableCode: TableRepository['regenerateTableCode'] = (
    tableId
  ): Promise<Table> => {
    return tableRegenerateCode(tableId).then(({ data }) => toTable(data));
  };

  fetchTableList = (options?: Partial<RequestConfig>): Promise<Table[]> => {
    return this.client
      .fetchQuery({
        queryKey: tableListQueryKey(),
        queryFn: () => tableList(options),
      })
      .then((data) => data.data.map(toTable));
  };
}
