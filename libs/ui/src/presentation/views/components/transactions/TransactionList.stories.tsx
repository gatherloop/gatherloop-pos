import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TransactionList } from './TransactionList';
import {
  mockOrderTransactionReady,
  mockTransactions,
  mockWallets,
} from '../../../../../.storybook/mocks/mockData';

const defaultArgs = {
  searchValue: '',
  onSearchValueChange: fn(),
  paymentStatus: 'all' as const,
  onPaymentStatusChange: fn(),
  source: 'all' as const,
  onSourceChange: fn(),
  fulfillment: 'all' as const,
  onFulfillmentChange: fn(),
  transactions: mockTransactions,
  currentPage: 1,
  onPageChange: fn(),
  totalItem: 2,
  itemPerPage: 10,
  onRetryButtonPress: fn(),
  onEditMenuPress: fn(),
  onDeleteMenuPress: fn(),
  onPayMenuPress: fn(),
  onUnpayMenuPress: fn(),
  onCompleteMenuPress: fn(),
  onUncompleteMenuPress: fn(),
  onPrintInvoiceMenuPress: fn(),
  onPrintOrderSlipMenuPress: fn(),
  onItemPress: fn(),
  wallets: mockWallets,
  walletId: null,
  onWalletIdChange: fn(),
};

const meta: Meta<typeof TransactionList> = {
  title: 'Components/Transactions/TransactionList',
  component: TransactionList,
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof TransactionList>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
  },
};

export const Loading: Story = {
  args: {
    variant: { type: 'loading' },
    transactions: [],
  },
};

export const Error: Story = {
  args: {
    variant: { type: 'error' },
    transactions: [],
  },
};

export const FilteredByWallet: Story = {
  args: {
    variant: { type: 'loaded' },
    walletId: 1,
    transactions: mockTransactions.filter((t) => t.wallet?.id === 1),
    totalItem: 1,
  },
};

export const PaidFilter: Story = {
  args: {
    variant: { type: 'loaded' },
    paymentStatus: 'paid' as const,
    transactions: mockTransactions.filter((t) => t.paidAt !== null),
    totalItem: 1,
  },
};

export const UnpaidFilter: Story = {
  args: {
    variant: { type: 'loaded' },
    paymentStatus: 'unpaid' as const,
    transactions: mockTransactions.filter((t) => t.paidAt === null),
    totalItem: 1,
  },
};

export const FilteredBySource: Story = {
  args: {
    variant: { type: 'loaded' },
    source: 'order' as const,
    transactions: mockTransactions.filter((t) => t.source === 'order'),
    totalItem: 1,
  },
};

export const FulfillmentStatuses: Story = {
  args: {
    variant: { type: 'loaded' },
    transactions: [...mockTransactions, mockOrderTransactionReady],
    totalItem: 3,
  },
};

export const FilteredByFulfillment: Story = {
  args: {
    variant: { type: 'loaded' },
    source: 'order' as const,
    fulfillment: 'preparing' as const,
    transactions: [...mockTransactions, mockOrderTransactionReady].filter(
      (t) => t.source === 'order' && t.completedAt === null
    ),
    totalItem: 1,
  },
};
