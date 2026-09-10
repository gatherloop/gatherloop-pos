import type { Meta, StoryObj } from '@storybook/react';
import { TransactionDetail } from './TransactionDetail';
import { mockTransaction } from '../../../../../.storybook/mocks/mockData';

const meta: Meta<typeof TransactionDetail> = {
  title: 'Components/Transactions/TransactionDetail',
  component: TransactionDetail,
  args: {
    name: mockTransaction.name,
    source: mockTransaction.source,
    table: mockTransaction.table,
    orderNumber: mockTransaction.orderNumber,
    createdAt: mockTransaction.createdAt,
    paidAt: mockTransaction.paidAt ?? undefined,
    walletName: mockTransaction.wallet?.name,
    total: mockTransaction.total,
    paidAmount: mockTransaction.paidAmount,
    transactionItems: mockTransaction.transactionItems,
    transactionCoupons: mockTransaction.transactionCoupons,
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
    table: { id: 1, label: 'A1', floorNumber: 1 },
    orderNumber: 0,
  },
};

export const FromPos: Story = {
  args: {
    source: 'pos',
    table: null,
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
