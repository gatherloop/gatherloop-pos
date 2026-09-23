import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { OrderHistoryListItem } from './OrderHistoryListItem';

const meta: Meta<typeof OrderHistoryListItem> = {
  title: 'Components/OrderHistory/OrderHistoryListItem',
  component: OrderHistoryListItem,
  args: {
    transactionNumber: 12,
    status: 'paid',
    method: 'qris',
    fulfillmentStatus: 'preparing',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    tableLabel: 'Meja 3',
    customerName: 'Andi',
    itemCount: 3,
    amount: 45000,
    onPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof OrderHistoryListItem>;

export const Preparing: Story = {};

export const Ready: Story = {
  args: { fulfillmentStatus: 'ready' },
};

export const AwaitingCashPayment: Story = {
  args: { status: 'pending', method: 'cash' },
};
