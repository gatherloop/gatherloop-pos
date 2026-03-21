import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SupplierDeleteAlert } from './SupplierDeleteAlert';

const meta: Meta<typeof SupplierDeleteAlert> = {
  title: 'Features/Suppliers/SupplierDeleteAlert',
  component: SupplierDeleteAlert,
  args: {
    isOpen: true,
    onCancel: fn(),
    onConfirm: fn(),
    isButtonDisabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof SupplierDeleteAlert>;

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
