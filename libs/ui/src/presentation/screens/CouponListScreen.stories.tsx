import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CouponListScreen } from './CouponListScreen';
import { mockCoupons } from '../../../.storybook/mocks/mockData';

const defaultArgs = {
  onLogoutPress: fn(),
  onEditMenuPress: fn(),
  onDeleteMenuPress: fn(),
  onItemPress: fn(),
  onRetryButtonPress: fn(),
  isDeleteModalOpen: false,
  isDeleteButtonDisabled: false,
  onDeleteCancel: fn(),
  onDeleteConfirm: fn(),
};

const meta: Meta<typeof CouponListScreen> = {
  title: 'Screens/Coupons/CouponListScreen',
  component: CouponListScreen,
  parameters: { layout: 'fullscreen' },
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof CouponListScreen>;

export const Loaded: Story = {
  args: { variant: { type: 'loaded', coupons: mockCoupons } },
};

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Empty: Story = {
  args: { variant: { type: 'empty' } },
};

export const Error: Story = {
  args: { variant: { type: 'error' } },
};

export const DeleteModalOpen: Story = {
  args: {
    variant: { type: 'loaded', coupons: mockCoupons },
    isDeleteModalOpen: true,
  },
};
