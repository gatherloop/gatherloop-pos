import { ExpenseStatisticListQueryRepository } from '../../domain';
import {
  DEFAULT_EXPENSE_STATISTIC_GROUP_BY,
  DEFAULT_EXPENSE_STATISTIC_PRESET,
  DEFAULT_EXPENSE_STATISTIC_VIEW,
  ExpenseStatisticView,
  getDateRangeForPreset,
  TransactionStatisticPreset,
} from '../../domain/entities';
import {
  getQueryParam,
  setQueryParam,
  createStringUnionParser,
} from '../../utils';

export class UrlExpenseStatisticListQueryRepository
  implements ExpenseStatisticListQueryRepository
{
  getView = (url?: string) => {
    const viewQuery = getQueryParam('expenseView', url);
    return viewQuery
      ? toView(viewQuery) ?? DEFAULT_EXPENSE_STATISTIC_VIEW
      : DEFAULT_EXPENSE_STATISTIC_VIEW;
  };

  setView: ExpenseStatisticListQueryRepository['setView'] = (view) => {
    setQueryParam('expenseView', view);
  };

  getGroupBy = (url?: string) => {
    const groupByQuery = getQueryParam('expenseGroupBy', url);
    return groupByQuery
      ? toGroupBy(groupByQuery) ?? DEFAULT_EXPENSE_STATISTIC_GROUP_BY
      : DEFAULT_EXPENSE_STATISTIC_GROUP_BY;
  };

  setGroupBy: ExpenseStatisticListQueryRepository['setGroupBy'] = (
    groupBy
  ) => {
    setQueryParam('expenseGroupBy', groupBy);
  };

  getPreset = (url?: string) => {
    const presetQuery = getQueryParam('expensePreset', url);
    return presetQuery
      ? toPreset(presetQuery) ?? DEFAULT_EXPENSE_STATISTIC_PRESET
      : DEFAULT_EXPENSE_STATISTIC_PRESET;
  };

  getStartDate = (url?: string) => {
    const startDateQuery = getQueryParam('expenseStartDate', url);
    if (startDateQuery) return startDateQuery;
    return getDateRangeForPreset(this.getPreset(url)).startDate;
  };

  getEndDate = (url?: string) => {
    const endDateQuery = getQueryParam('expenseEndDate', url);
    if (endDateQuery) return endDateQuery;
    return getDateRangeForPreset(this.getPreset(url)).endDate;
  };

  setDateRange: ExpenseStatisticListQueryRepository['setDateRange'] = ({
    preset,
    startDate,
    endDate,
  }) => {
    setQueryParam('expensePreset', preset);
    if (startDate) setQueryParam('expenseStartDate', startDate);
    if (endDate) setQueryParam('expenseEndDate', endDate);
  };
}

const toView = createStringUnionParser<ExpenseStatisticView[]>([
  'budget',
  'combined',
]);

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
