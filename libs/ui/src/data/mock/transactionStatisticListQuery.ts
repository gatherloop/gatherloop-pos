import { TransactionStatisticListQueryRepository } from '../../domain/repositories/transactionStatisticListQuery';

export class MockTransactionStatisticListQueryRepository
  implements TransactionStatisticListQueryRepository
{
  getGroupBy = () => 'date' as const;

  setGroupBy = (groupBy: 'date' | 'month') => {
    console.log(`Setting group by to ${groupBy}`);
  };
}
