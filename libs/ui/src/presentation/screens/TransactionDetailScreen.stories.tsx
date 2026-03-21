import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TransactionDetailScreen } from './TransactionDetailScreen';
import { mockTransaction } from '../../../.storybook/mocks/mockData';

const defaultArgs = {
  onLogoutPress: fn(),
  createdAt: mockTransaction.createdAt,
  name: mockTransaction.name,
  orderNumber: mockTransaction.orderNumber,
  total: mockTransaction.total,
  transactionItems: mockTransaction.transactionItems,
  transactionCoupons: mockTransaction.transactionCoupons,
  paidAmount: mockTransaction.paidAmount,
};

const meta: Meta<typeof TransactionDetailScreen> = {
  title: 'Screens/Transactions/TransactionDetailScreen',
  component: TransactionDetailScreen,
  parameters: { layout: 'fullscreen' },
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof TransactionDetailScreen>;

export const Paid: Story = {
  args: {
    paidAt: mockTransaction.paidAt ?? undefined,
    walletName: mockTransaction.wallet?.name,
  },
};

export const Unpaid: Story = {
  args: {
    paidAt: undefined,
    walletName: undefined,
    paidAmount: 0,
  },
};

export const WithCoupons: Story = {
  args: {
    transactionCoupons: [
      { id: 1, coupon: { id: 1, code: 'DISC10', type: 'percentage', amount: 10, createdAt: '2024-01-15T08:00:00.000Z' }, type: 'percentage', amount: 10 },
    ],
    paidAt: mockTransaction.paidAt ?? undefined,
    walletName: mockTransaction.wallet?.name,
  },
};
