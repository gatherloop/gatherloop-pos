import { Table, TableForm } from '../../domain/entities';
import { TableRepository } from '../../domain/repositories/table';

const initialTables: Table[] = [
  {
    id: 1,
    code: '3F7H9K2M5P',
    label: 'Meja 01',
    createdAt: '2024-03-20T00:00:00.000Z',
  },
  {
    id: 2,
    code: '8A2C4E6G8J',
    label: 'Meja 02',
    createdAt: '2024-03-21T00:00:00.000Z',
  },
];

export class MockTableRepository implements TableRepository {
  tables: Table[] = initialTables.map((table) => ({ ...table }));

  private nextId = 3;
  private nextCodeSuffix = 0;
  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  async fetchTableList(): Promise<Table[]> {
    if (this.shouldFail) throw new Error('Failed to fetch tables');
    return [...this.tables];
  }

  async fetchTableById(tableId: number): Promise<Table> {
    if (this.shouldFail) throw new Error('Failed to fetch table');
    const table = this.tables.find((t) => t.id === tableId);
    if (!table) throw new Error('Table not found');
    return { ...table };
  }

  async deleteTableById(tableId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to delete table');
    this.tables = this.tables.filter((t) => t.id !== tableId);
  }

  async createTable(formValues: TableForm): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to create table');
    this.tables.push({
      id: this.nextId++,
      code: this.generateCode(),
      label: formValues.label,
      createdAt: new Date().toISOString(),
    });
  }

  async updateTable(formValues: TableForm, tableId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to update table');
    const idx = this.tables.findIndex((t) => t.id === tableId);
    if (idx === -1) throw new Error('Table not found');
    this.tables[idx] = {
      ...this.tables[idx],
      label: formValues.label,
    };
  }

  async regenerateTableCode(tableId: number): Promise<Table> {
    if (this.shouldFail) throw new Error('Failed to regenerate table code');
    const idx = this.tables.findIndex((t) => t.id === tableId);
    if (idx === -1) throw new Error('Table not found');
    this.tables[idx] = {
      ...this.tables[idx],
      code: this.generateCode(),
    };
    return { ...this.tables[idx] };
  }

  private generateCode(): string {
    return `NEWCODE${(this.nextCodeSuffix++).toString().padStart(3, '0')}`;
  }

  reset() {
    this.tables = initialTables.map((table) => ({ ...table }));
    this.nextId = 3;
    this.nextCodeSuffix = 0;
    this.shouldFail = false;
  }
}
