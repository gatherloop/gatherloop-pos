import type { Meta, StoryObj } from '@storybook/react';
import { AmountStepper } from './AmountStepper';

const meta: Meta<typeof AmountStepper> = {
  title: 'Menu/AmountStepper',
  component: AmountStepper,
  args: {
    onChange: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof AmountStepper>;

export const Default: Story = {
  args: { amount: 1 },
};

export const HigherAmount: Story = {
  args: { amount: 4 },
};
