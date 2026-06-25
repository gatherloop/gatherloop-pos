import { TransactionStatisticPreset } from '../entities';

export interface TransactionStatisticListQueryRepository {
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
