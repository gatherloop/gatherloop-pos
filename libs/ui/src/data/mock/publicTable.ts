import { PublicTable } from '../../domain/entities';
import {
  PublicTableRepository,
  TableNotFoundError,
} from '../../domain/repositories/publicTable';

const initialTables: Record<string, PublicTable> = {
  '3F7H9K2M5P': { id: 1, label: 'Meja 01' },
  '8A2C4E6G8J': { id: 2, label: 'Meja 02' },
};

export class MockPublicTableRepository implements PublicTableRepository {
  tables: Record<string, PublicTable> = { ...initialTables };
  codes: string[] = Object.keys(initialTables);

  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  resolveTableByCode = async (code: string): Promise<PublicTable> => {
    if (this.shouldFail) throw new Error('Failed to resolve table');
    const table = this.tables[code];
    if (!table) throw new TableNotFoundError();
    return { ...table };
  };

  reset() {
    this.tables = { ...initialTables };
    this.codes = Object.keys(initialTables);
    this.shouldFail = false;
  }
}
