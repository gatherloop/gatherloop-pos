// eslint-disable-next-line @nx/enforce-module-boundaries
import { PurchaseListQueryRepository, PurchaseTypeFilter } from '../../domain';
import { getQueryParam, setQueryParam } from '../../utils/queryParam';
import { createStringUnionParser } from '../../utils/stringUnionParser';

const toPurchaseTypeFilter = createStringUnionParser<PurchaseTypeFilter[]>([
  'all',
  'online',
  'offline',
  'delivery',
]);

export class UrlPurchaseListQueryRepository
  implements PurchaseListQueryRepository
{
  getPurchaseTypeFilter = (): PurchaseTypeFilter => {
    const param = getQueryParam('purchaseType');
    return toPurchaseTypeFilter(param ?? '') ?? 'all';
  };

  setPurchaseTypeFilter = (filter: PurchaseTypeFilter) => {
    setQueryParam('purchaseType', filter);
  };
}
