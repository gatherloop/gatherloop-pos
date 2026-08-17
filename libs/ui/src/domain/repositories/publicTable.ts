import { PublicTable } from '../entities';

// Thrown by a PublicTableRepository implementation when a code does not
// resolve to any table — unknown or deleted (D6). Distinct from a
// transport/server error so TableResolveUsecase can route to the
// "QR tidak valid" screen instead of a retryable error.
export class TableNotFoundError extends Error {
  constructor() {
    super('Table not found');
    this.name = 'TableNotFoundError';
  }
}

export interface PublicTableRepository {
  resolveTableByCode: (code: string) => Promise<PublicTable>;
}
