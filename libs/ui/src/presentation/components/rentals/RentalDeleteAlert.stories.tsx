import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { RentalDeleteAlert } from './RentalDeleteAlert';

const meta: Meta<typeof RentalDeleteAlert> = {
  title: 'Features/Rentals/RentalDeleteAlert',
  component: RentalDeleteAlert,
  args: {
    isOpen: true,
    onCancel: fn(),
    isButtonDisabled: false,
    onButtonConfirmPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof RentalDeleteAlert>;

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
