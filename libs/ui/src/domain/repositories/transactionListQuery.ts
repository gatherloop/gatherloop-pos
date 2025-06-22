import { PaymentStatus } from '../entities';

export interface TransactionListQueryRepository {
  getPage: () => number;
  setPage: (page: number) => void;

  getItemPerPage: () => number;
  setItemPerPage: (itemPerPage: number) => void;

  getSearchQuery: () => string;
  setSearchQuery: (query: string) => void;

  getSortBy: () => 'created_at';
  setSortBy: (sortBy: 'created_at') => void;

  getOrderBy: () => 'asc' | 'desc';
  setOrderBy: (orderBy: 'asc' | 'desc') => void;

  getPaymentStatus: () => PaymentStatus;
  setPaymentStatus: (paymentStatus: PaymentStatus) => void;
}
