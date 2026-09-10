import type { Meta, StoryObj } from '@storybook/react';
import { PaymentSuccessView } from './PaymentSuccessView';

const meta: Meta<typeof PaymentSuccessView> = {
  title: 'Components/Checkout/PaymentSuccessView',
  component: PaymentSuccessView,
  args: {
    amount: 36000,
    customerName: 'Budi',
  },
};

export default meta;
type Story = StoryObj<typeof PaymentSuccessView>;

export const Default: Story = {};
