import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { TransactionListScreen } from './TransactionListScreen';
import {
  mockTransactions,
  mockWallet,
  mockWallets,
} from '../../../.storybook/mocks/mockData';

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

const LoadedStory = () => {
  const payForm = useForm({ defaultValues: { wallet: mockWallet, paidAmount: 30000000 } });
  return (
    <TransactionListScreen
      {...defaultArgs}
      variant={{ type: 'loaded' }}
      payForm={payForm}
    />
  );
};

const LoadingStory = () => {
  const payForm = useForm({ defaultValues: { wallet: mockWallet, paidAmount: 0 } });
  return (
    <TransactionListScreen
      {...defaultArgs}
      variant={{ type: 'loading' }}
      payForm={payForm}
    />
  );
};

const ErrorStory = () => {
  const payForm = useForm({ defaultValues: { wallet: mockWallet, paidAmount: 0 } });
  return (
    <TransactionListScreen
      {...defaultArgs}
      variant={{ type: 'error' }}
      payForm={payForm}
    />
  );
};

const PayModalStory = () => {
  const payForm = useForm({ defaultValues: { wallet: mockWallet, paidAmount: 30000000 } });
  return (
    <TransactionListScreen
      {...defaultArgs}
      variant={{ type: 'loaded' }}
      payForm={payForm}
      isPayModalOpen={true}
    />
  );
};

const meta: Meta<typeof TransactionListScreen> = {
  title: 'Screens/Transactions/TransactionListScreen',
  component: TransactionListScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TransactionListScreen>;

export const Loaded: Story = { render: () => <LoadedStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
export const Error: Story = { render: () => <ErrorStory /> };
export const PayModalOpen: Story = { render: () => <PayModalStory /> };
