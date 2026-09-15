import type { Meta, StoryObj } from '@storybook/react';
import { OrderReadyView } from './OrderReadyView';

const meta: Meta<typeof OrderReadyView> = {
  title: 'Components/OrderStatus/OrderReadyView',
  component: OrderReadyView,
  args: {
    transactionNumber: 12,
  },
};

export default meta;
type Story = StoryObj<typeof OrderReadyView>;

export const Default: Story = {};

export const LargeNumber: Story = {
  args: { transactionNumber: 1234 },
};
