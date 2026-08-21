import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TransactionList } from './TransactionList';
import {
  mockTransactions,
  mockWallet,
  mockWallets,
} from '../../../../.storybook/mocks/mockData';
import { Wallet } from '../../../domain';

const manyMockWallets: Wallet[] = [
  mockWallets[0],
  mockWallets[1],
  mockWallets[2],
  { ...mockWallet, id: 4, name: 'GoPay' },
  { ...mockWallet, id: 5, name: 'OVO' },
  { ...mockWallet, id: 6, name: 'ShopeePay' },
];

const defaultArgs = {
  searchValue: '',
  onSearchValueChange: fn(),
  paymentStatus: 'all' as const,
  onPaymentStatusChange: fn(),
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
  onPrintInvoiceMenuPress: fn(),
  onPrintOrderSlipMenuPress: fn(),
  onItemPress: fn(),
  wallets: mockWallets,
  walletId: null,
  onWalletIdChange: fn(),
};

const meta: Meta<typeof TransactionList> = {
  title: 'Features/Transactions/TransactionList',
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

// FR-2 in docs/prd-transaction-mobile-ux.md: at 360px the search input takes
// its own full-width row, with clear + Filter on a second row.
export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  args: {
    variant: { type: 'loaded' },
    searchValue: 'Budi',
  },
};

// FR-2: the filter popover stays on-screen at 360px and scrolls internally
// once the wallet list grows past a handful of entries.
export const MobileManyWallets: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  args: {
    variant: { type: 'loaded' },
    wallets: manyMockWallets,
  },
};
