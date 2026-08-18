import type { Meta, StoryObj } from '@storybook/react';
import { CartBar } from './CartBar';

const meta: Meta<typeof CartBar> = {
  title: 'Cart/CartBar',
  component: CartBar,
  args: {
    onPress: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof CartBar>;

export const Default: Story = {
  args: { itemCount: 3, total: 54000 },
};

export const SingleItem: Story = {
  args: { itemCount: 1, total: 18000 },
};
