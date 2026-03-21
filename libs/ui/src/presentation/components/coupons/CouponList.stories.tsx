import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CouponList } from './CouponList';
import { mockCoupons } from '../../../../.storybook/mocks/mockData';

const defaultArgs = {
  onRetryButtonPress: fn(),
  onDeleteMenuPress: fn(),
  onEditMenuPress: fn(),
  onItemPress: fn(),
};

const meta: Meta<typeof CouponList> = {
  title: 'Features/Coupons/CouponList',
  component: CouponList,
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof CouponList>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded', coupons: mockCoupons },
  },
};

export const Loading: Story = {
  args: {
    variant: { type: 'loading' },
  },
};

export const Empty: Story = {
  args: {
    variant: { type: 'empty' },
  },
};

export const Error: Story = {
  args: {
    variant: { type: 'error' },
  },
};
