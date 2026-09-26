import type { Meta, StoryObj } from '@storybook/react';
import { OrderReadyView } from './OrderReadyView';

const meta: Meta<typeof OrderReadyView> = {
  title: 'Components/OrderStatus/OrderReadyView',
  component: OrderReadyView,
  args: {
    transactionNumber: 12,
    amount: 54000,
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
type Story = StoryObj<typeof OrderReadyView>;

export const Default: Story = {};

export const LargeNumber: Story = {
  args: { transactionNumber: 1234 },
};

export const PayAtPickup: Story = {
  args: { payAtPickupAmount: 54000 },
};
