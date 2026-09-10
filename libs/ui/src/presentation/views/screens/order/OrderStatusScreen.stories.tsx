import type { Meta, StoryObj } from '@storybook/react';
import { OrderStatusScreen } from './OrderStatusScreen';

const table = { id: 1, label: 'Meja 1', floorNumber: 1 };

const payment = {
  reference: 'ORD0000000000001',
  status: 'paid' as const,
  amount: 54000,
  qrContent: '00020101021226610014ID.CO.QRIS.WWW',
  expiredAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  paidAt: new Date().toISOString(),
  customerName: 'Budi',
  tableLabel: 'Meja 1',
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

const meta: Meta<typeof OrderStatusScreen> = {
  title: 'Screens/Order/OrderStatusScreen',
  component: OrderStatusScreen,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    tableVariant: { type: 'resolved', table },
    onBackToMenuPress: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof OrderStatusScreen>;

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Loaded: Story = {
  args: { variant: { type: 'loaded', payment } },
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
