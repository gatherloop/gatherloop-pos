import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TransactionDetail } from './TransactionDetail';
import { mockTransaction } from '../../../../../.storybook/mocks/mockData';

const meta: Meta<typeof TransactionDetail> = {
  title: 'Components/Transactions/TransactionDetail',
  component: TransactionDetail,
  args: {
    name: mockTransaction.name,
    source: mockTransaction.source,
    paymentMethod: mockTransaction.paymentMethod,
    table: mockTransaction.table,
    pagerNumber: mockTransaction.pagerNumber,
    transactionNumber: mockTransaction.transactionNumber,
    createdAt: mockTransaction.createdAt,
    paidAt: mockTransaction.paidAt ?? undefined,
    completedAt: mockTransaction.completedAt,
    walletName: mockTransaction.wallet?.name,
    total: mockTransaction.total,
    paidAmount: mockTransaction.paidAmount,
    transactionItems: mockTransaction.transactionItems,
    transactionCoupons: mockTransaction.transactionCoupons,
    onCompleteButtonPress: fn(),
    onUncompleteButtonPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TransactionDetail>;

export const Paid: Story = {};

export const Unpaid: Story = {
  args: {
    paidAt: undefined,
    walletName: undefined,
    paidAmount: 0,
  },
};

export const FromOrderApp: Story = {
  args: {
    source: 'order',
    paymentMethod: 'qris',
    table: { id: 1, label: 'A1', floorNumber: 1 },
    pagerNumber: 0,
    completedAt: null,
  },
};

export const CashAwaitingPayment: Story = {
  args: {
    source: 'order',
    paymentMethod: 'cash',
    table: { id: 1, label: 'A1', floorNumber: 1 },
    pagerNumber: 0,
    completedAt: null,
    paidAt: undefined,
    walletName: undefined,
    paidAmount: 0,
  },
};

export const FromPos: Story = {
  args: {
    source: 'pos',
    paymentMethod: null,
    table: null,
  },
};

export const OrderReady: Story = {
  args: {
    source: 'order',
    table: { id: 1, label: 'A1', floorNumber: 1 },
    pagerNumber: 0,
    completedAt: '2024-01-20T10:45:00.000Z',
  },
};

export const WithCoupon: Story = {
  args: {
    transactionCoupons: [
      {
        id: 1,
        coupon: {
          id: 1,
          code: 'COFFEE10',
          type: 'percentage',
          amount: 10,
          createdAt: '2024-01-15T08:00:00.000Z',
        },
        type: 'percentage',
        amount: 10,
      },
    ],
  },
};
