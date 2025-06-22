export interface TransactionStatisticListQueryRepository {
  getGroupBy: () => 'date' | 'month';
  setGroupBy: (groupBy: 'date' | 'month') => void;
}
