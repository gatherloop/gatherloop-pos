import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TransactionListItem } from './TransactionListItem';

const meta: Meta<typeof TransactionListItem> = {
  title: 'Components/Transactions/TransactionListItem',
  component: TransactionListItem,
  args: {
    name: 'Order #001',
    source: 'pos',
    diningOption: 'dine_in',
    table: null,
    pagerNumber: 1,
    transactionNumber: 42,
    total: 70000,
    createdAt: '2024-01-20T10:00:00.000Z',
    paidAt: '2024-01-20T10:30:00.000Z',
    completedAt: null,
    walletName: 'Cash',
    onPayMenuPress: fn(),
    onUnpayMenuPress: fn(),
    onCompleteMenuPress: fn(),
    onUncompleteMenuPress: fn(),
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
    pagerNumber: 99,
    total: 350000,
    walletName: 'Bank Transfer',
  },
};

export const FromOrderApp: Story = {
  args: {
    name: 'Budi',
    source: 'order',
    table: { id: 1, label: 'A1', floorNumber: 1 },
    pagerNumber: 0,
    completedAt: null,
  },
};

export const CashAwaitingPayment: Story = {
  args: {
    name: 'Budi',
    source: 'order',
    paymentMethod: 'cash',
    table: { id: 1, label: 'A1', floorNumber: 1 },
    pagerNumber: 0,
    completedAt: null,
    paidAt: undefined,
    walletName: undefined,
  },
};

export const CashPaid: Story = {
  args: {
    name: 'Budi',
    source: 'order',
    paymentMethod: 'cash',
    table: { id: 1, label: 'A1', floorNumber: 1 },
    pagerNumber: 0,
    completedAt: null,
  },
};

export const QrisAwaitingPayment: Story = {
  args: {
    name: 'Budi',
    source: 'order',
    paymentMethod: 'qris',
    table: { id: 1, label: 'A1', floorNumber: 1 },
    pagerNumber: 0,
    completedAt: null,
    paidAt: undefined,
    walletName: undefined,
  },
};

export const QrisPaid: Story = {
  args: {
    name: 'Budi',
    source: 'order',
    paymentMethod: 'qris',
    table: { id: 1, label: 'A1', floorNumber: 1 },
    pagerNumber: 0,
    completedAt: null,
  },
};

export const FromPos: Story = {
  args: {
    source: 'pos',
    table: null,
  },
};

export const TakeawayPos: Story = {
  args: {
    name: 'Siti',
    source: 'pos',
    diningOption: 'takeaway',
    table: null,
  },
};

export const TakeawayFromOrderApp: Story = {
  args: {
    name: 'Budi',
    source: 'order',
    diningOption: 'takeaway',
    table: { id: 1, label: 'A1', floorNumber: 1 },
    pagerNumber: 0,
    completedAt: null,
  },
};

export const TakeawayCashAwaitingPayment: Story = {
  args: {
    name: 'Budi',
    source: 'order',
    diningOption: 'takeaway',
    paymentMethod: 'cash',
    table: { id: 1, label: 'A1', floorNumber: 1 },
    pagerNumber: 0,
    completedAt: null,
    paidAt: undefined,
    walletName: undefined,
  },
};

export const TakeawayQrisAwaitingPayment: Story = {
  args: {
    name: 'Budi',
    source: 'order',
    diningOption: 'takeaway',
    paymentMethod: 'qris',
    table: { id: 1, label: 'A1', floorNumber: 1 },
    pagerNumber: 0,
    completedAt: null,
    paidAt: undefined,
    walletName: undefined,
  },
};

export const OrderReady: Story = {
  args: {
    name: 'Budi',
    source: 'order',
    table: { id: 1, label: 'A1', floorNumber: 1 },
    pagerNumber: 0,
    completedAt: '2024-01-20T10:45:00.000Z',
  },
};

export const OneDigitTransactionNumber: Story = {
  args: {
    transactionNumber: 7,
  },
};

export const TwoDigitTransactionNumber: Story = {
  args: {
    transactionNumber: 42,
  },
};

export const ThreeDigitTransactionNumber: Story = {
  args: {
    transactionNumber: 128,
  },
};

export const FourDigitTransactionNumber: Story = {
  args: {
    transactionNumber: 1024,
  },
};
