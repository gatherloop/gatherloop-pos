import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CouponUpdateScreen } from './CouponUpdateScreen';

const meta: Meta<typeof CouponUpdateScreen> = {
  title: 'Screens/Coupons/CouponUpdateScreen',
  component: CouponUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof CouponUpdateScreen>;

export const Default: Story = {
  args: {
    defaultValues: { code: 'DISC10', type: 'percentage', amount: 10 },
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
    defaultValues: { code: '', type: 'percentage', amount: 0 },
    isSubmitDisabled: true,
    variant: { type: 'loading' },
  },
};
