import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ExpenseDeleteAlert } from './ExpenseDeleteAlert';

const meta: Meta<typeof ExpenseDeleteAlert> = {
  title: 'Features/Expenses/ExpenseDeleteAlert',
  component: ExpenseDeleteAlert,
  args: {
    isOpen: true,
    onCancel: fn(),
    isButtonDisabled: false,
    onButtonConfirmPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ExpenseDeleteAlert>;

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
