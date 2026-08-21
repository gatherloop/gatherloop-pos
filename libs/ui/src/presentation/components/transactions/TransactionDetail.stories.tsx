import type { Meta, StoryObj } from '@storybook/react';
import { TransactionDetail } from './TransactionDetail';
import {
  mockTransaction,
  mockTransactionItem,
  mockCoupon,
} from '../../../../.storybook/mocks/mockData';

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

// Phase 4 of docs/prd-transaction-mobile-ux.md (FR-4): at 360px no metric row
// (Note + Price + Amount + Discount Amount + Subtotal) should overflow
// horizontally; a long note wraps, and coupon subtotals stay right-aligned.
export const MobileManyItemsWithNoteAndDiscount: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  args: {
    transactionItems: Array.from({ length: 5 }, (_, index) => ({
      ...mockTransactionItem,
      id: index + 1,
      note:
        index === 0
          ? 'Extra hot, less ice, no sugar please and pack it separately'
          : '',
      discountAmount: index === 1 ? 5000 : 0,
      subtotal: index === 1 ? 65000 : 70000,
    })),
    transactionCoupons: [
      {
        id: 1,
        coupon: mockCoupon,
        type: 'percentage',
        amount: 10,
      },
    ],
  },
};
