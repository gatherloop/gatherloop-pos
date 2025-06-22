import {
  PaymentStatus,
  Transaction,
  TransactionForm,
  TransactionStatistic,
} from '../entities';

export type TransactionListParams = {
  page: number;
  itemPerPage: number;
  query: string;
  sortBy: 'created_at';
  orderBy: 'asc' | 'desc';
  paymentStatus: PaymentStatus;
};

export interface TransactionRepository {
  getTransactionList: (params: TransactionListParams) => {
    transactions: Transaction[];
    totalItem: number;
  };

  fetchTransactionList: (params: TransactionListParams) => Promise<{
    transactions: Transaction[];
    totalItem: number;
  }>;

  fetchTransactionById: (transactionId: number) => Promise<Transaction>;

  deleteTransactionById: (transactionId: number) => Promise<void>;

  createTransaction: (
    formValues: TransactionForm
  ) => Promise<{ transactionId: number }>;

  updateTransaction: (
    formValues: TransactionForm,
    transactionId: number
  ) => Promise<void>;

  payTransaction: (transactionId: number, walletId: number) => Promise<void>;

  getTransactionStatisticList: (
    groupBy: 'date' | 'month'
  ) => TransactionStatistic[];

  fetchTransactionStatisticList: (
    groupBy: 'date' | 'month'
  ) => Promise<TransactionStatistic[]>;
}
