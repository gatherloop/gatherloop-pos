import type { Meta, StoryObj } from '@storybook/react';
import { PendingPaymentBar } from './PendingPaymentBar';

const meta: Meta<typeof PendingPaymentBar> = {
  title: 'Components/Cart/PendingPaymentBar',
  component: PendingPaymentBar,
  args: {
    onContinuePress: () => {
      // Storybook action stand-in
    },
    onCountdownElapsed: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof PendingPaymentBar>;

export const Qris: Story = {
  args: {
    method: 'qris',
    amount: 45000,
    expiredAt: new Date(Date.now() + 4 * 60 * 1000 + 12 * 1000).toISOString(),
  },
};

export const Cash: Story = {
  args: {
    method: 'cash',
    amount: 32000,
    expiredAt: new Date(Date.now() + 9 * 60 * 1000).toISOString(),
  },
};
