import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CouponDeleteAlert } from './CouponDeleteAlert';

const meta: Meta<typeof CouponDeleteAlert> = {
  title: 'Features/Coupons/CouponDeleteAlert',
  component: CouponDeleteAlert,
  args: {
    isOpen: true,
    onCancel: fn(),
    onConfirm: fn(),
    isButtonDisabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof CouponDeleteAlert>;

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
