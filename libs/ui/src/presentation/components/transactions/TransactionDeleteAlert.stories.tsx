import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TransactionDeleteAlert } from './TransactionDeleteAlert';

const meta: Meta<typeof TransactionDeleteAlert> = {
  title: 'Features/Transactions/TransactionDeleteAlert',
  component: TransactionDeleteAlert,
  args: {
    isOpen: true,
    onCancel: fn(),
    isButtonDisabled: false,
    onButtonConfirmPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TransactionDeleteAlert>;

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
