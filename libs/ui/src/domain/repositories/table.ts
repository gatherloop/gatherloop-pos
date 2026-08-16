import { Table, TableForm } from '../entities';

export interface TableRepository {
  fetchTableList: () => Promise<Table[]>;

  fetchTableById: (tableId: number) => Promise<Table>;

  deleteTableById: (tableId: number) => Promise<void>;

  createTable: (formValues: TableForm) => Promise<void>;

  updateTable: (formValues: TableForm, tableId: number) => Promise<void>;

  regenerateTableCode: (tableId: number) => Promise<Table>;
}
