import { PurchaseList } from '../entities';

export interface PurchaseListRepository {
  fetchPurchaseList: (stockCheckId: number) => Promise<PurchaseList>;
}
