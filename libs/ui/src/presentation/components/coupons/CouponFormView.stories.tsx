import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CouponFormView } from './CouponFormView';

const meta: Meta<typeof CouponFormView> = {
  title: 'Features/Coupons/CouponFormView',
  component: CouponFormView,
};

export default meta;
type Story = StoryObj<typeof CouponFormView>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues: { code: '', type: 'percentage', amount: 0 },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
  },
};

export const Populated: Story = {
  args: {
    ...Loaded.args,
    defaultValues: { code: 'COFFEE10', type: 'percentage', amount: 10 },
  },
};

export const Loading: Story = {
  args: {
    ...Loaded.args,
    variant: { type: 'loading' },
    isSubmitDisabled: true,
  },
};

export const Error: Story = {
  args: {
    ...Loaded.args,
    variant: { type: 'error', onRetryButtonPress: fn() },
    isSubmitDisabled: true,
  },
};

export const SubmitDisabled: Story = {
  args: {
    ...Loaded.args,
    isSubmitDisabled: true,
  },
};

export const Submitting: Story = {
  args: {
    ...Loaded.args,
    isSubmitDisabled: true,
    isSubmitting: true,
  },
};
