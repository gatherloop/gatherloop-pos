import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CouponCreateScreen } from './CouponCreateScreen';

const meta: Meta<typeof CouponCreateScreen> = {
  title: 'Screens/Coupons/CouponCreateScreen',
  component: CouponCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof CouponCreateScreen>;

export const Default: Story = {
  args: {
    defaultValues: { code: '', type: 'percentage', amount: 0 },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
    onLogoutPress: fn(),
    variant: { type: 'loaded' },
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    isSubmitDisabled: true,
    variant: { type: 'loading' },
  },
};
