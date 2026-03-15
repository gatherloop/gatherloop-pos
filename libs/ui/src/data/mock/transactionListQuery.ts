import { PaymentStatus } from '../../domain/entities';
import { TransactionListQueryRepository } from '../../domain/repositories/transactionListQuery';

export class MockTransactionListQueryRepository
  implements TransactionListQueryRepository
{
  getPage = () => 1;
  getItemPerPage = () => 10;
  getSearchQuery = () => '';
  getSortBy = () => 'created_at' as const;
  getOrderBy = () => 'asc' as const;
  getPaymentStatus = () => 'all' as PaymentStatus;
  getWalletId = () => null as number | null;

  setPage = (page: number) => {
    console.log(`Setting page to ${page}`);
  };
  setItemPerPage = (itemPerPage: number) => {
    console.log(`Setting items per page to ${itemPerPage}`);
  };
  setSearchQuery = (query: string) => {
    console.log(`Setting search query to ${query}`);
  };
  setSortBy = (sortBy: 'created_at') => {
    console.log(`Setting sort by to ${sortBy}`);
  };
  setOrderBy = (orderBy: 'asc' | 'desc') => {
    console.log(`Setting order by to ${orderBy}`);
  };
  setPaymentStatus = (paymentStatus: PaymentStatus) => {
    console.log(`Setting payment status to ${paymentStatus}`);
  };
  setWalletId = (walletId: number | null) => {
    console.log(`Setting wallet id to ${walletId}`);
  };
}
