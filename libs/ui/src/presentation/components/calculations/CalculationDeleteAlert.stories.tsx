import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CalculationDeleteAlert } from './CalculationDeleteAlert';

const meta: Meta<typeof CalculationDeleteAlert> = {
  title: 'Features/Calculations/CalculationDeleteAlert',
  component: CalculationDeleteAlert,
  args: {
    isOpen: true,
    onCancel: fn(),
    isButtonDisabled: false,
    onButtonConfirmPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CalculationDeleteAlert>;

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
