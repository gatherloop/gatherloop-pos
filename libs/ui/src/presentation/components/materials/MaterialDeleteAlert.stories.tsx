import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { MaterialDeleteAlert } from './MaterialDeleteAlert';

const meta: Meta<typeof MaterialDeleteAlert> = {
  title: 'Features/Materials/MaterialDeleteAlert',
  component: MaterialDeleteAlert,
  args: {
    isOpen: true,
    onCancel: fn(),
    onConfirm: fn(),
    isButtonDisabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof MaterialDeleteAlert>;

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
