import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { OrderLeaveConfirmAlert } from './OrderLeaveConfirmAlert';

const meta: Meta<typeof OrderLeaveConfirmAlert> = {
  title: 'Components/OrderStatus/OrderLeaveConfirmAlert',
  component: OrderLeaveConfirmAlert,
  args: {
    isOpen: true,
    transactionNumber: 12,
    onCancel: fn(),
    onConfirm: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof OrderLeaveConfirmAlert>;

export const Open: Story = {};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};
