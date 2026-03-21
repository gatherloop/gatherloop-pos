import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CalculationCompleteAlert } from './CalculationCompleteAlert';

const meta: Meta<typeof CalculationCompleteAlert> = {
  title: 'Features/Calculations/CalculationCompleteAlert',
  component: CalculationCompleteAlert,
  args: {
    isOpen: true,
    onCancel: fn(),
    isButtonDisabled: false,
    onButtonConfirmPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CalculationCompleteAlert>;

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
