import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TransactionUnpayAlert } from './TransactionUnpayAlert';

const meta: Meta<typeof TransactionUnpayAlert> = {
  title: 'Features/Transactions/TransactionUnpayAlert',
  component: TransactionUnpayAlert,
  args: {
    isOpen: true,
    isButtonDisabled: false,
    onCancel: fn(),
    onConfirm: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TransactionUnpayAlert>;

export const Open: Story = {};

export const Disabled: Story = {
  args: {
    isButtonDisabled: true,
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};
