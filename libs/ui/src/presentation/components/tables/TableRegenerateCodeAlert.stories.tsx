import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TableRegenerateCodeAlert } from './TableRegenerateCodeAlert';

const meta: Meta<typeof TableRegenerateCodeAlert> = {
  title: 'Features/Tables/TableRegenerateCodeAlert',
  component: TableRegenerateCodeAlert,
  args: {
    isOpen: true,
    onCancel: fn(),
    onConfirm: fn(),
    isButtonDisabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof TableRegenerateCodeAlert>;

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
