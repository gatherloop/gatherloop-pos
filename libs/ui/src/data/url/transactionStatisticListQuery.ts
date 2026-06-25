import { TransactionStatisticListQueryRepository } from '../../domain';
import {
  DEFAULT_TRANSACTION_STATISTIC_PRESET,
  getDateRangeForPreset,
  TransactionStatisticPreset,
} from '../../domain/entities';
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

  getPreset = (url?: string) => {
    const presetQuery = getQueryParam('preset', url);
    return presetQuery
      ? toPreset(presetQuery) ?? DEFAULT_TRANSACTION_STATISTIC_PRESET
      : DEFAULT_TRANSACTION_STATISTIC_PRESET;
  };

  getStartDate = (url?: string) => {
    const startDateQuery = getQueryParam('startDate', url);
    if (startDateQuery) return startDateQuery;
    return getDateRangeForPreset(this.getPreset(url)).startDate;
  };

  getEndDate = (url?: string) => {
    const endDateQuery = getQueryParam('endDate', url);
    if (endDateQuery) return endDateQuery;
    return getDateRangeForPreset(this.getPreset(url)).endDate;
  };

  setDateRange: TransactionStatisticListQueryRepository['setDateRange'] = ({
    preset,
    startDate,
    endDate,
  }) => {
    setQueryParam('preset', preset);
    if (startDate) setQueryParam('startDate', startDate);
    if (endDate) setQueryParam('endDate', endDate);
  };
}

const toGroupBy = createStringUnionParser<('date' | 'month')[]>([
  'date',
  'month',
]);

const toPreset = createStringUnionParser<TransactionStatisticPreset[]>([
  'last7Days',
  'last30Days',
  'last3Months',
  'last12Months',
  'thisMonth',
  'thisYear',
  'custom',
]);
