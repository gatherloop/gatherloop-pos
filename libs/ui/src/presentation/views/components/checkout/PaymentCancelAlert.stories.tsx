import type { Meta, StoryObj } from '@storybook/react';
import { PaymentCancelAlert } from './PaymentCancelAlert';

const meta: Meta<typeof PaymentCancelAlert> = {
  title: 'Components/Checkout/PaymentCancelAlert',
  component: PaymentCancelAlert,
  args: {
    isOpen: true,
    isCancelling: false,
    onConfirm: () => {
      // Storybook action stand-in
    },
    onDismiss: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof PaymentCancelAlert>;

export const Qris: Story = {
  args: { method: 'qris' },
};

export const Cash: Story = {
  args: { method: 'cash' },
};

export const Cancelling: Story = {
  args: { method: 'qris', isCancelling: true },
};
