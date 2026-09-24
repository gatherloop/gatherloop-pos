import {
  PaymentStatus,
  Transaction,
  TransactionForm,
  TransactionFulfillmentFilter,
  TransactionSourceFilter,
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
    category: { id: 1, name: 'Category 1', station: 'NONE' as const, createdAt: '2024-03-20T00:00:00.000Z' },
    imageUrl: '',
    saleType: 'purchase' as const,
    status: 'published' as const,
    options: [],
    createdAt: '2024-03-20T00:00:00.000Z',
    isAvailable: true,
    availabilityTracking: 'none' as const,
    isSellable: true,
  },
  createdAt: '2024-03-20T00:00:00.000Z',
  values: [],
  pricingTiers: [],
  isAvailable: true,
  isSellable: true,
};

const initialTransactions: Transaction[] = [
  {
    id: 1,
    createdAt: '2024-03-20T00:00:00.000Z',
    name: 'Transaction 1',
    source: 'pos',
    diningOption: 'dine_in',
    paymentMethod: null,
    table: null,
    pagerNumber: 1,
    transactionNumber: 1,
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
        productName: 'Product 1',
        values: [],
      },
    ],
    transactionCoupons: [],
    wallet: null,
    paidAt: null,
    paidAmount: 0,
    completedAt: null,
  },
  {
    id: 2,
    createdAt: '2024-03-21T00:00:00.000Z',
    name: 'Transaction 2',
    source: 'order',
    diningOption: 'dine_in',
    paymentMethod: 'cash',
    table: { id: 1, label: 'A1', floorNumber: 1 },
    pagerNumber: 0,
    transactionNumber: 1,
    total: 200000,
    totalIncome: 180000,
    transactionItems: [],
    transactionCoupons: [],
    wallet: null,
    paidAt: null,
    paidAmount: 0,
    completedAt: null,
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
  private transactionNumberCounters: Record<string, number> = {};

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
    source: TransactionSourceFilter;
    fulfillment: TransactionFulfillmentFilter;
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
    source: TransactionSourceFilter;
    fulfillment: TransactionFulfillmentFilter;
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
  ): Promise<{ transactionId: number; transactionNumber: number }> {
    if (this.shouldFail) throw new Error('Failed to create transaction');
    const createdAt = new Date().toISOString();
    const businessDate = createdAt.slice(0, 10);
    const transactionNumber = (this.transactionNumberCounters[businessDate] ?? 0) + 1;
    this.transactionNumberCounters[businessDate] = transactionNumber;
    const transactionId = this.nextId++;
    this.transactions.push({
      id: transactionId,
      createdAt,
      name: formValues.name,
      source: 'pos',
      diningOption: formValues.diningOption,
      paymentMethod: null,
      table: null,
      pagerNumber: formValues.pagerNumber,
      transactionNumber,
      total: 0,
      totalIncome: 0,
      transactionItems: [],
      transactionCoupons: [],
      wallet: null,
      paidAt: null,
      paidAmount: 0,
      completedAt: null,
    });
    return { transactionId, transactionNumber };
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
      pagerNumber: formValues.pagerNumber,
      diningOption: formValues.diningOption,
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

  async completeTransaction(transactionId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to complete transaction');
    const idx = this.transactions.findIndex((t) => t.id === transactionId);
    if (idx === -1) throw new Error('Transaction not found');
    this.transactions[idx] = {
      ...this.transactions[idx],
      completedAt: new Date().toISOString(),
    };
  }

  async uncompleteTransaction(transactionId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to uncomplete transaction');
    const idx = this.transactions.findIndex((t) => t.id === transactionId);
    if (idx === -1) throw new Error('Transaction not found');
    this.transactions[idx] = {
      ...this.transactions[idx],
      completedAt: null,
    };
  }

  getTransactionStatisticList(_params: {
    groupBy: 'date' | 'month';
    startDate: string | null;
    endDate: string | null;
  }): TransactionStatistic[] {
    return [...this.statistics];
  }

  async fetchTransactionStatisticList(_params: {
    groupBy: 'date' | 'month';
    startDate: string | null;
    endDate: string | null;
  }): Promise<TransactionStatistic[]> {
    if (this.shouldFail)
      throw new Error('Failed to fetch transaction statistics');
    return Promise.resolve([...this.statistics]);
  }

  reset() {
    this.transactions = [...initialTransactions];
    this.statistics = [...initialStatistics];
    this.nextId = 3;
    this.shouldFail = false;
    this.transactionNumberCounters = {};
  }
}
