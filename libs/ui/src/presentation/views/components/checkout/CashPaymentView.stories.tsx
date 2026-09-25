import type { Meta, StoryObj } from '@storybook/react';
import { CashPaymentView } from './CashPaymentView';

const meta: Meta<typeof CashPaymentView> = {
  title: 'Components/Checkout/CashPaymentView',
  component: CashPaymentView,
  args: {
    cashierLocation: 'Lantai 1',
    transactionNumber: 12,
    amount: 45000,
    expiredAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    onCountdownElapsed: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof CashPaymentView>;

export const Default: Story = {};

export const AboutToExpire: Story = {
  args: { expiredAt: new Date(Date.now() + 10 * 1000).toISOString() },
};
