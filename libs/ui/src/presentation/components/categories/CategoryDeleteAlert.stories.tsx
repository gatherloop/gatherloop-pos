import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CategoryDeleteAlert } from './CategoryDeleteAlert';

const meta: Meta<typeof CategoryDeleteAlert> = {
  title: 'Features/Categories/CategoryDeleteAlert',
  component: CategoryDeleteAlert,
  args: {
    isOpen: true,
    onCancel: fn(),
    onConfirm: fn(),
    isButtonDisabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof CategoryDeleteAlert>;

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
