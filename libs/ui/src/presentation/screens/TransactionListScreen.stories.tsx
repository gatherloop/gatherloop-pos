import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TransactionListScreen } from './TransactionListScreen';
import { mockTransactions, mockWallets } from '../../../.storybook/mocks/mockData';

const defaultArgs = {
  onLogoutPress: fn(),
  onDeleteMenuPress: fn(),
  onEditMenuPress: fn(),
  onPayMenuPress: fn(),
  onUnpayMenuPress: fn(),
  onItemPress: fn(),
  onPrintInvoiceMenuPress: fn(),
  onPrintOrderSlipMenuPress: fn(),
  onRetryButtonPress: fn(),
  transactions: mockTransactions,
  searchValue: '',
  onSearchValueChange: fn(),
  paymentStatus: 'all' as const,
  onPaymentStatusChange: fn(),
  currentPage: 1,
  onPageChange: fn(),
  totalItem: 2,
  itemPerPage: 10,
  wallets: mockWallets,
  walletId: null,
  onWalletIdChange: fn(),
  isDeleteModalOpen: false,
  isDeleteButtonDisabled: false,
  onDeleteCancel: fn(),
  onDeleteConfirm: fn(),
  isPayModalOpen: false,
  onPayCancel: fn(),
  onPaySubmit: fn(),
  payWalletSelectOptions: mockWallets.map((w) => ({ label: w.name, value: w })),
  payTransactionTotal: 30000000,
  isPayButtonDisabled: false,
  isUnpayModalOpen: false,
  isUnpayButtonDisabled: false,
  onUnpayCancel: fn(),
  onUnpayConfirm: fn(),
};

const meta: Meta<typeof TransactionListScreen> = {
  title: 'Screens/Transactions/TransactionListScreen',
  component: TransactionListScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TransactionListScreen>;

export const Loaded: Story = {
  args: { ...defaultArgs, variant: { type: 'loaded' } },
};

export const Loading: Story = {
  args: { ...defaultArgs, variant: { type: 'loading' } },
};

export const Error: Story = {
  args: { ...defaultArgs, variant: { type: 'error' } },
};

export const PayModalOpen: Story = {
  args: { ...defaultArgs, variant: { type: 'loaded' }, isPayModalOpen: true },
};
