import type { Meta, StoryObj } from '@storybook/react';
import { CheckoutScreen } from './CheckoutScreen';

const table = { id: 1, label: 'Meja 1', floorNumber: 1 };

const meta: Meta<typeof CheckoutScreen> = {
  title: 'Screens/Order/CheckoutScreen',
  component: CheckoutScreen,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    tableVariant: { type: 'resolved', table },
    onBackToCartPress: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof CheckoutScreen>;

export const Enabled: Story = {
  args: { enabled: true },
};

export const Disabled: Story = {
  args: { enabled: false },
};
