import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CouponListItem } from './CouponListItem';

const meta: Meta<typeof CouponListItem> = {
  title: 'Features/Coupons/CouponListItem',
  component: CouponListItem,
  args: {
    code: 'DISCOUNT10',
    amount: 10,
    type: 'percentage',
    onEditMenuPress: fn(),
    onDeleteMenuPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CouponListItem>;

export const Percentage: Story = {};

export const Fixed: Story = {
  args: {
    code: 'FLAT50K',
    amount: 50000,
    type: 'fixed',
  },
};

export const WithoutMenus: Story = {
  args: {
    onEditMenuPress: undefined,
    onDeleteMenuPress: undefined,
  },
};
