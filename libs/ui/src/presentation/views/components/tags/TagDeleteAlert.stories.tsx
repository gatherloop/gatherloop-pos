import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TagDeleteAlert } from './TagDeleteAlert';

const meta: Meta<typeof TagDeleteAlert> = {
  title: 'Components/Tags/TagDeleteAlert',
  component: TagDeleteAlert,
  args: {
    isOpen: true,
    onCancel: fn(),
    onConfirm: fn(),
    isButtonDisabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof TagDeleteAlert>;

export const Open: Story = {};

export const WithVariants: Story = {
  args: {
    variantCount: 5,
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
