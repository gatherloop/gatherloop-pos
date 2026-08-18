import type { Meta, StoryObj } from '@storybook/react';
import { CheckoutScreen } from './CheckoutScreen';

const meta: Meta<typeof CheckoutScreen> = {
  title: 'Checkout/CheckoutScreen',
  component: CheckoutScreen,
  args: {
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
