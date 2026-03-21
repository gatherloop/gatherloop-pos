import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ProductDeleteAlert } from './ProductDeleteAlert';

const meta: Meta<typeof ProductDeleteAlert> = {
  title: 'Features/Products/ProductDeleteAlert',
  component: ProductDeleteAlert,
  args: {
    isOpen: true,
    onCancel: fn(),
    onConfirm: fn(),
    isButtonDisabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof ProductDeleteAlert>;

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
