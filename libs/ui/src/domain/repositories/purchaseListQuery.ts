import { PurchaseTypeFilter } from '../entities/Material';

export interface PurchaseListQueryRepository {
  getPurchaseTypeFilter: () => PurchaseTypeFilter;
  setPurchaseTypeFilter: (filter: PurchaseTypeFilter) => void;
}
