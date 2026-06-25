import { TransactionStatisticListQueryRepository } from '../../domain/repositories/transactionStatisticListQuery';
import { getDateRangeForPreset } from '../../domain/entities';

export class MockTransactionStatisticListQueryRepository
  implements TransactionStatisticListQueryRepository
{
  getGroupBy = () => 'date' as const;

  setGroupBy = (groupBy: 'date' | 'month') => {
    console.log(`Setting group by to ${groupBy}`);
  };

  getPreset = () => 'last30Days' as const;

  getStartDate = () => getDateRangeForPreset('last30Days').startDate;

  getEndDate = () => getDateRangeForPreset('last30Days').endDate;

  setDateRange: TransactionStatisticListQueryRepository['setDateRange'] = ({
    preset,
    startDate,
    endDate,
  }) => {
    console.log(
      `Setting date range to preset=${preset} startDate=${startDate} endDate=${endDate}`
    );
  };
}
