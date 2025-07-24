import {
  PaymentStatus,
  Transaction,
  TransactionForm,
  TransactionStatistic,
} from '../entities';

export interface TransactionRepository {
  getTransactionList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    paymentStatus: PaymentStatus;
  }) => {
    transactions: Transaction[];
    totalItem: number;
  };

  fetchTransactionList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    paymentStatus: PaymentStatus;
  }) => Promise<{
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

  payTransaction: (
    transactionId: number,
    walletId: number,
    paidAmount: number
  ) => Promise<void>;

  getTransactionStatisticList: (
    groupBy: 'date' | 'month'
  ) => TransactionStatistic[];

  fetchTransactionStatisticList: (
    groupBy: 'date' | 'month'
  ) => Promise<TransactionStatistic[]>;
}
