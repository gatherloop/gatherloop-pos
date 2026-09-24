import type { Meta, StoryObj } from '@storybook/react';
import { PendingPaymentNotice } from './PendingPaymentNotice';

const meta: Meta<typeof PendingPaymentNotice> = {
  title: 'Components/Cart/PendingPaymentNotice',
  component: PendingPaymentNotice,
  args: {
    onContinuePress: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof PendingPaymentNotice>;

export const Default: Story = {};
