import { TransactionStatisticListQueryRepository } from '../../domain';
import {
  DEFAULT_TRANSACTION_STATISTIC_PRESET,
  getDateRangeForPreset,
} from '../../domain/entities';

/**
 * Used where a `TransactionStatisticListUsecase` instance's date range is driven
 * programmatically (e.g. mirroring another widget's period) rather than by its own
 * UI — persisting to the URL here would collide with a sibling instance (such as the
 * dashboard's own revenue chart) that already owns the unprefixed `preset`/`startDate`/
 * `endDate`/`groupBy` query params.
 */
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
