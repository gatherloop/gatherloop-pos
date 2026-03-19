import {
  PaymentStatus,
  Transaction,
  TransactionForm,
  TransactionStatistic,
} from '../../domain/entities';
import { TransactionRepository } from '../../domain/repositories/transaction';

const mockVariant = {
  id: 1,
  name: 'Variant 1',
  price: 50000,
  materials: [],
  product: {
    id: 1,
    name: 'Product 1',
    category: { id: 1, name: 'Category 1', createdAt: '2024-03-20T00:00:00.000Z' },
    imageUrl: '',
    saleType: 'purchase' as const,
    options: [],
    createdAt: '2024-03-20T00:00:00.000Z',
  },
  createdAt: '2024-03-20T00:00:00.000Z',
  values: [],
};

const initialTransactions: Transaction[] = [
  {
    id: 1,
    createdAt: '2024-03-20T00:00:00.000Z',
    name: 'Transaction 1',
    orderNumber: 1,
    total: 100000,
    totalIncome: 90000,
    transactionItems: [
      {
        id: 1,
        variant: mockVariant,
        amount: 1,
        price: 50000,
        discountAmount: 0,
        subtotal: 50000,
        note: '',
      },
    ],
    transactionCoupons: [],
    wallet: null,
    paidAt: null,
    paidAmount: 0,
  },
  {
    id: 2,
    createdAt: '2024-03-21T00:00:00.000Z',
    name: 'Transaction 2',
    orderNumber: 2,
    total: 200000,
    totalIncome: 180000,
    transactionItems: [],
    transactionCoupons: [],
    wallet: null,
    paidAt: null,
    paidAmount: 0,
  },
];

const initialStatistics: TransactionStatistic[] = [
  { date: '2024-03-20', total: 100000, totalIncome: 90000 },
  { date: '2024-03-21', total: 200000, totalIncome: 180000 },
];

export class MockTransactionRepository implements TransactionRepository {
  transactions: Transaction[] = [...initialTransactions];
  statistics: TransactionStatistic[] = [...initialStatistics];

  private nextId = 3;
  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  getTransactionList(_params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    paymentStatus: PaymentStatus;
    walletId: number | null;
  }): { transactions: Transaction[]; totalItem: number } {
    return {
      transactions: [...this.transactions],
      totalItem: this.transactions.length,
    };
  }

  async fetchTransactionList(_params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    paymentStatus: PaymentStatus;
    walletId: number | null;
  }): Promise<{ transactions: Transaction[]; totalItem: number }> {
    if (this.shouldFail) throw new Error('Failed to fetch transactions');
    return Promise.resolve({
      transactions: [...this.transactions],
      totalItem: this.transactions.length,
    });
  }

  async fetchTransactionById(transactionId: number): Promise<Transaction> {
    if (this.shouldFail) throw new Error('Failed to fetch transaction');
    const transaction = this.transactions.find((t) => t.id === transactionId);
    if (!transaction) throw new Error('Transaction not found');
    return { ...transaction };
  }

  async deleteTransactionById(transactionId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to delete transaction');
    this.transactions = this.transactions.filter((t) => t.id !== transactionId);
  }

  async createTransaction(
    formValues: TransactionForm
  ): Promise<{ transactionId: number }> {
    if (this.shouldFail) throw new Error('Failed to create transaction');
    this.transactions.push({
      id: this.nextId++,
      createdAt: new Date().toISOString(),
      name: formValues.name,
      orderNumber: formValues.orderNumber,
      total: 0,
      totalIncome: 0,
      transactionItems: [],
      transactionCoupons: [],
      wallet: null,
      paidAt: null,
      paidAmount: 0,
    });
    return { transactionId: 1 };
  }

  async updateTransaction(
    formValues: TransactionForm,
    transactionId: number
  ): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to update transaction');
    const idx = this.transactions.findIndex((t) => t.id === transactionId);
    if (idx === -1) throw new Error('Transaction not found');
    this.transactions[idx] = {
      ...this.transactions[idx],
      name: formValues.name,
      orderNumber: formValues.orderNumber,
    };
  }

  async payTransaction(
    transactionId: number,
    _walletId: number,
    paidAmount: number
  ): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to pay transaction');
    const idx = this.transactions.findIndex((t) => t.id === transactionId);
    if (idx === -1) throw new Error('Transaction not found');
    this.transactions[idx] = {
      ...this.transactions[idx],
      paidAt: new Date().toISOString(),
      paidAmount,
    };
  }

  async unpayTransaction(transactionId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to unpay transaction');
    const idx = this.transactions.findIndex((t) => t.id === transactionId);
    if (idx === -1) throw new Error('Transaction not found');
    this.transactions[idx] = {
      ...this.transactions[idx],
      paidAt: null,
      paidAmount: 0,
    };
  }

  getTransactionStatisticList(
    _groupBy: 'date' | 'month'
  ): TransactionStatistic[] {
    return [...this.statistics];
  }

  async fetchTransactionStatisticList(
    _groupBy: 'date' | 'month'
  ): Promise<TransactionStatistic[]> {
    if (this.shouldFail)
      throw new Error('Failed to fetch transaction statistics');
    return Promise.resolve([...this.statistics]);
  }

  reset() {
    this.transactions = [...initialTransactions];
    this.statistics = [...initialStatistics];
    this.nextId = 3;
    this.shouldFail = false;
  }
}
