import type { Meta, StoryObj } from '@storybook/react';
import { TransactionDetail } from './TransactionDetail';
import { mockTransaction } from '../../../../.storybook/mocks/mockData';

const meta: Meta<typeof TransactionDetail> = {
  title: 'Features/Transactions/TransactionDetail',
  component: TransactionDetail,
  args: {
    name: mockTransaction.name,
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

// Phase 3 of docs/prd-transaction-mobile-ux.md (FR-3): at 360px the summary
// block must read as a compact single column, ≤200px tall, above the first
// transaction item without scrolling.
export const MobilePaid: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

// Proves the unpaid-date bug is gone: no Paid At / Paid Amount / Change /
// Wallet rows, and no fabricated "today" payment date — just a single
// `Payment — Unpaid` row.
export const MobileUnpaid: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  args: {
    paidAt: undefined,
    walletName: undefined,
    paidAmount: 0,
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
