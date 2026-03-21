import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { VariantDeleteAlert } from './VariantDeleteAlert';

const meta: Meta<typeof VariantDeleteAlert> = {
  title: 'Features/Variants/VariantDeleteAlert',
  component: VariantDeleteAlert,
  args: {
    isOpen: true,
    onCancel: fn(),
    onConfirm: fn(),
    isButtonDisabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof VariantDeleteAlert>;

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
