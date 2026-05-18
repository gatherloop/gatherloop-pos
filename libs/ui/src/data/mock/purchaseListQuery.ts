import { PurchaseListQueryRepository, PurchaseTypeFilter } from '../../domain';

export class MockPurchaseListQueryRepository
  implements PurchaseListQueryRepository
{
  getPurchaseTypeFilter = (): PurchaseTypeFilter => 'all';
  setPurchaseTypeFilter = (_filter: PurchaseTypeFilter) => undefined;
}
