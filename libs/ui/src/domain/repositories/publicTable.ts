import { PublicTable } from '../entities';
import { RequestConfig } from '@kubb/swagger-client/client';

export class TableNotFoundError extends Error {
  constructor() {
    super('Table not found');
    this.name = 'TableNotFoundError';
  }
}

export interface PublicTableRepository {
  resolveTableByCode: (
    code: string,
    options?: Partial<RequestConfig>
  ) => Promise<PublicTable>;
}
