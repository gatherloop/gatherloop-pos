import { TransactionStatisticListQueryRepository } from '../../domain';
import {
  DEFAULT_TRANSACTION_STATISTIC_PRESET,
  getDateRangeForPreset,
} from '../../domain/entities';

export class InMemoryTransactionStatisticListQueryRepository
  implements TransactionStatisticListQueryRepository
{
  getGroupBy = () => 'date' as const;

  setGroupBy: TransactionStatisticListQueryRepository['setGroupBy'] = () => {
    // no-op: this instance's range is driven by its owner, not the URL.
  };

  getPreset = () => DEFAULT_TRANSACTION_STATISTIC_PRESET;

  getStartDate = () =>
    getDateRangeForPreset(DEFAULT_TRANSACTION_STATISTIC_PRESET).startDate;

  getEndDate = () =>
    getDateRangeForPreset(DEFAULT_TRANSACTION_STATISTIC_PRESET).endDate;

  setDateRange: TransactionStatisticListQueryRepository['setDateRange'] =
    () => {
      // no-op: this instance's range is driven by its owner, not the URL.
    };
}
