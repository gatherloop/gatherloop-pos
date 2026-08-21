import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TransactionListItem } from './TransactionListItem';

const meta: Meta<typeof TransactionListItem> = {
  title: 'Features/Transactions/TransactionListItem',
  component: TransactionListItem,
  args: {
    name: 'Order #001',
    orderNumber: 1,
    total: 70000,
    createdAt: '2024-01-20T10:00:00.000Z',
    paidAt: '2024-01-20T10:30:00.000Z',
    walletName: 'Cash',
    onPayMenuPress: fn(),
    onUnpayMenuPress: fn(),
    onEditMenuPress: fn(),
    onDeleteMenuPress: fn(),
    onPrintInvoiceMenuPress: fn(),
    onPrintOrderSlipMenuPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TransactionListItem>;

export const Paid: Story = {};

export const Unpaid: Story = {
  args: {
    paidAt: undefined,
    walletName: undefined,
  },
};

export const HighValue: Story = {
  args: {
    name: 'Bulk Order #099',
    orderNumber: 99,
    total: 350000,
    walletName: 'Bank Transfer',
  },
};

// Phase 1 of docs/prd-transaction-mobile-ux.md (FR-1): at 360px a paid row
// (all four footer items shown) must be a compact, single-line-per-item
// block, not a ~260px stack.
export const MobilePaid: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

export const MobileUnpaid: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  args: {
    paidAt: undefined,
    walletName: undefined,
  },
};
