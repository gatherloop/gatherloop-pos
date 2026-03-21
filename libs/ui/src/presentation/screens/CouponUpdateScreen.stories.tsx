import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { CouponUpdateScreen } from './CouponUpdateScreen';
import type { CouponForm } from '../../domain';

const UpdateStory = () => {
  const form = useForm<CouponForm>({
    defaultValues: { code: 'DISC10', type: 'percentage', amount: 10 },
  });
  return (
    <CouponUpdateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
      variant={{ type: 'loaded' }}
    />
  );
};

const LoadingStory = () => {
  const form = useForm<CouponForm>({ defaultValues: { code: '', type: 'percentage', amount: 0 } });
  return (
    <CouponUpdateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      onLogoutPress={fn()}
      variant={{ type: 'loading' }}
    />
  );
};

const meta: Meta<typeof CouponUpdateScreen> = {
  title: 'Screens/Coupons/CouponUpdateScreen',
  component: CouponUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof CouponUpdateScreen>;

export const Default: Story = { render: () => <UpdateStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
