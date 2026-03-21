import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { CouponFormView } from './CouponFormView';
import type { CouponForm } from '../../../domain';

const defaultValues: CouponForm = {
  code: '',
  type: 'percentage',
  amount: 0,
};

const LoadedStory = () => {
  const form = useForm<CouponForm>({ defaultValues });
  return (
    <CouponFormView
      variant={{ type: 'loaded' }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
    />
  );
};

const PopulatedStory = () => {
  const form = useForm<CouponForm>({
    defaultValues: { code: 'COFFEE10', type: 'percentage', amount: 10 },
  });
  return (
    <CouponFormView
      variant={{ type: 'loaded' }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
    />
  );
};

const meta: Meta<typeof CouponFormView> = {
  title: 'Features/Coupons/CouponFormView',
  component: CouponFormView,
};

export default meta;
type Story = StoryObj<typeof CouponFormView>;

export const Loaded: Story = {
  render: () => <LoadedStory />,
};

export const Populated: Story = {
  render: () => <PopulatedStory />,
};

const LoadingStory = () => {
  const form = useForm<CouponForm>({ defaultValues });
  return (
    <CouponFormView
      variant={{ type: 'loading' }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
    />
  );
};

const ErrorStory = () => {
  const form = useForm<CouponForm>({ defaultValues });
  return (
    <CouponFormView
      variant={{ type: 'error', onRetryButtonPress: fn() }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
    />
  );
};

export const Loading: Story = {
  render: () => <LoadingStory />,
};

export const Error: Story = {
  render: () => <ErrorStory />,
};
