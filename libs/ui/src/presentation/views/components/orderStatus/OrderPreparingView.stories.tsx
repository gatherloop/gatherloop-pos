import type { Meta, StoryObj } from '@storybook/react';
import { OrderPreparingView } from './OrderPreparingView';

const meta: Meta<typeof OrderPreparingView> = {
  title: 'Components/OrderStatus/OrderPreparingView',
  component: OrderPreparingView,
  args: {
    transactionNumber: 12,
    tableLabel: 'Meja 1',
    amount: 54000,
    isPolling: false,
    onBackToMenuPress: () => {
      // Storybook action stand-in
    },
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
  },
};

export default meta;
type Story = StoryObj<typeof OrderPreparingView>;

export const Default: Story = {};

export const Polling: Story = {
  args: { isPolling: true },
};

export const LargeNumber: Story = {
  args: { transactionNumber: 1234 },
};
