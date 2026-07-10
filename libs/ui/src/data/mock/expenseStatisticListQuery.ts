import { ExpenseStatisticListQueryRepository } from '../../domain/repositories/expenseStatisticListQuery';
import {
  DEFAULT_EXPENSE_STATISTIC_GROUP_BY,
  DEFAULT_EXPENSE_STATISTIC_PRESET,
  DEFAULT_EXPENSE_STATISTIC_VIEW,
  getDateRangeForPreset,
} from '../../domain/entities';

export class MockExpenseStatisticListQueryRepository
  implements ExpenseStatisticListQueryRepository
{
  getView = () => DEFAULT_EXPENSE_STATISTIC_VIEW;

  setView: ExpenseStatisticListQueryRepository['setView'] = (view) => {
    console.log(`Setting expense statistic view to ${view}`);
  };

  getGroupBy = () => DEFAULT_EXPENSE_STATISTIC_GROUP_BY;

  setGroupBy: ExpenseStatisticListQueryRepository['setGroupBy'] = (
    groupBy
  ) => {
    console.log(`Setting expense statistic group by to ${groupBy}`);
  };

  getPreset = () => DEFAULT_EXPENSE_STATISTIC_PRESET;

  getStartDate = () =>
    getDateRangeForPreset(DEFAULT_EXPENSE_STATISTIC_PRESET).startDate;

  getEndDate = () =>
    getDateRangeForPreset(DEFAULT_EXPENSE_STATISTIC_PRESET).endDate;

  setDateRange: ExpenseStatisticListQueryRepository['setDateRange'] = ({
    preset,
    startDate,
    endDate,
  }) => {
    console.log(
      `Setting expense statistic date range to preset=${preset} startDate=${startDate} endDate=${endDate}`
    );
  };
}
