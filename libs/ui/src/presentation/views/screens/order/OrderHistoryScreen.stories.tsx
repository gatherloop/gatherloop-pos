import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { OrderHistoryScreen } from './OrderHistoryScreen';

const payments = [
  {
    reference: 'ORD0000000000002',
    status: 'paid' as const,
    fulfillmentStatus: 'preparing' as const,
    transactionNumber: 2,
    customerName: 'Andi',
    tableLabel: 'Meja 3',
    amount: 45000,
    itemCount: 3,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    paidAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
  {
    reference: 'ORD0000000000001',
    status: 'paid' as const,
    fulfillmentStatus: 'ready' as const,
    transactionNumber: 1,
    customerName: 'Andi',
    tableLabel: 'Meja 3',
    amount: 18000,
    itemCount: 1,
    createdAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    paidAt: new Date(Date.now() - 64 * 60 * 1000).toISOString(),
  },
];

const meta: Meta<typeof OrderHistoryScreen> = {
  title: 'Screens/Order/OrderHistoryScreen',
  component: OrderHistoryScreen,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onItemPress: fn(),
    onEmptyActionPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof OrderHistoryScreen>;

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Loaded: Story = {
  args: { variant: { type: 'loaded', payments } },
};

export const Empty: Story = {
  args: { variant: { type: 'empty' } },
};

export const Error: Story = {
  args: { variant: { type: 'error', onRetryPress: fn() } },
};
