import { ExpenseStatisticView, TransactionStatisticPreset } from '../entities';

export interface ExpenseStatisticListQueryRepository {
  getView: () => ExpenseStatisticView;
  setView: (view: ExpenseStatisticView) => void;
  getGroupBy: () => 'date' | 'month';
  setGroupBy: (groupBy: 'date' | 'month') => void;
  getPreset: () => TransactionStatisticPreset;
  getStartDate: () => string | null;
  getEndDate: () => string | null;
  setDateRange: (params: {
    preset: TransactionStatisticPreset;
    startDate: string | null;
    endDate: string | null;
  }) => void;
}
