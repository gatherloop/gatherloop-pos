import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { CouponCreateScreen } from './CouponCreateScreen';
import type { CouponForm } from '../../domain';

const defaultValues: CouponForm = { code: '', type: 'percentage', amount: 0 };

const CreateStory = () => {
  const form = useForm<CouponForm>({ defaultValues });
  return (
    <CouponCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
      variant={{ type: 'loaded' }}
    />
  );
};

const LoadingStory = () => {
  const form = useForm<CouponForm>({ defaultValues });
  return (
    <CouponCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      onLogoutPress={fn()}
      variant={{ type: 'loading' }}
    />
  );
};

const meta: Meta<typeof CouponCreateScreen> = {
  title: 'Screens/Coupons/CouponCreateScreen',
  component: CouponCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof CouponCreateScreen>;

export const Default: Story = { render: () => <CreateStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
