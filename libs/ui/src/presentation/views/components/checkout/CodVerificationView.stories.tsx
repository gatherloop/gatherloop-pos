import type { Meta, StoryObj } from '@storybook/react';
import { CodVerificationView } from './CodVerificationView';

const meta: Meta<typeof CodVerificationView> = {
  title: 'Components/Checkout/CodVerificationView',
  component: CodVerificationView,
  args: {
    transactionNumber: 12,
    amount: 45000,
    expiredAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    onCountdownElapsed: () => {
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
type Story = StoryObj<typeof CodVerificationView>;

export const Default: Story = {};

export const AboutToExpire: Story = {
  args: { expiredAt: new Date(Date.now() + 30 * 1000).toISOString() },
};
