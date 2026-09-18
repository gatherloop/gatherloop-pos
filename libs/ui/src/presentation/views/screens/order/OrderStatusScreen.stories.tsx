import type { Meta, StoryObj } from '@storybook/react';
import { OrderStatusScreen } from './OrderStatusScreen';

const paidPayment = {
  reference: 'ORD0000000000001',
  status: 'paid' as const,
  amount: 54000,
  qrContent: '00020101021226610014ID.CO.QRIS.WWW',
  expiredAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  paidAt: new Date().toISOString(),
  customerName: 'Budi',
  tableLabel: 'Meja 1',
  transactionNumber: 12,
  fulfillmentStatus: 'preparing' as const,
  items: [
    {
      name: 'Es Kopi Susu',
      amount: 2,
      price: 18000,
      subtotal: 36000,
      note: 'less sugar',
      options: [{ name: 'Ukuran', value: 'Regular' }],
    },
    {
      name: 'Roti Bakar',
      amount: 1,
      price: 18000,
      subtotal: 18000,
      note: '',
      options: [],
    },
  ],
};

const pendingPayment = {
  ...paidPayment,
  status: 'pending' as const,
  paidAt: null,
};

const meta: Meta<typeof OrderStatusScreen> = {
  title: 'Screens/Order/OrderStatusScreen',
  component: OrderStatusScreen,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onBackToMenuPress: () => {
      // Storybook action stand-in
    },
    onBackToCartPress: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof OrderStatusScreen>;

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const AwaitingPayment: Story = {
  args: {
    variant: {
      type: 'awaitingPayment',
      payment: pendingPayment,
      onCountdownElapsed: () => {
        // Storybook action stand-in
      },
    },
  },
};

export const Preparing: Story = {
  args: {
    variant: {
      type: 'preparing',
      payment: paidPayment,
      isPolling: false,
      notificationOptIn: {
        type: 'idle',
        onSubscribePress: () => {
          // Storybook action stand-in
        },
      },
    },
  },
};

export const Ready: Story = {
  args: {
    variant: {
      type: 'ready',
      payment: { ...paidPayment, fulfillmentStatus: 'ready' },
    },
  },
};

export const Expired: Story = {
  args: { variant: { type: 'expired' } },
};

export const NotFound: Story = {
  args: { variant: { type: 'notFound' } },
};

export const Error: Story = {
  args: {
    variant: {
      type: 'error',
      onRetryPress: () => {
        // Storybook action stand-in
      },
    },
  },
};

export const WithHistoryButton: Story = {
  args: {
    variant: {
      type: 'preparing',
      payment: paidPayment,
      isPolling: false,
      notificationOptIn: { type: 'hidden' },
    },
    onHistoryPress: () => {
      // Storybook action stand-in
    },
  },
};
