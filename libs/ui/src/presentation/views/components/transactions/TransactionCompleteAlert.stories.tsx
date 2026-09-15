import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TransactionCompleteAlert } from './TransactionCompleteAlert';

const meta: Meta<typeof TransactionCompleteAlert> = {
  title: 'Components/Transactions/TransactionCompleteAlert',
  component: TransactionCompleteAlert,
  args: {
    isOpen: true,
    action: 'complete',
    isButtonDisabled: false,
    onCancel: fn(),
    onConfirm: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TransactionCompleteAlert>;

export const Complete: Story = {};

export const Uncomplete: Story = {
  args: {
    action: 'uncomplete',
  },
};

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
