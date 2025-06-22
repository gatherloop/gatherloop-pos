import { TransactionStatisticListQueryRepository } from '../../domain';
import {
  getQueryParam,
  setQueryParam,
  createStringUnionParser,
} from '../../utils';

export class UrlTransactionStatisticListQueryRepository
  implements TransactionStatisticListQueryRepository
{
  getGroupBy = (url?: string) => {
    const groupByQuery = getQueryParam('groupBy', url);
    return groupByQuery ? toGroupBy(groupByQuery) ?? 'date' : 'date';
  };

  setGroupBy: TransactionStatisticListQueryRepository['setGroupBy'] = (
    groupBy
  ) => {
    setQueryParam('groupBy', groupBy);
  };
}

const toGroupBy = createStringUnionParser<('date' | 'month')[]>([
  'date',
  'month',
]);
