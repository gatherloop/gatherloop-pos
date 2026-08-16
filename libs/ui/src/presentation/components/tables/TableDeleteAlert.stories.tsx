import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TableDeleteAlert } from './TableDeleteAlert';

const meta: Meta<typeof TableDeleteAlert> = {
  title: 'Features/Tables/TableDeleteAlert',
  component: TableDeleteAlert,
  args: {
    isOpen: true,
    onCancel: fn(),
    onConfirm: fn(),
    isButtonDisabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof TableDeleteAlert>;

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
