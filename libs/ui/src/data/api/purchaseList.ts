import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  stockCheckGetPurchaseList,
  stockCheckGetPurchaseListQueryKey,
} from '../../../../api-contract/src';
import { PurchaseList, PurchaseListRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { toPurchaseList } from './purchaseList.transformer';

export class ApiPurchaseListRepository implements PurchaseListRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchPurchaseList = (
    stockCheckId: number,
    options?: Partial<RequestConfig>
  ): Promise<PurchaseList> => {
    return this.client
      .fetchQuery({
        queryKey: stockCheckGetPurchaseListQueryKey(stockCheckId),
        queryFn: () => stockCheckGetPurchaseList(stockCheckId, options),
      })
      .then(({ data }) => toPurchaseList(data));
  };
}
