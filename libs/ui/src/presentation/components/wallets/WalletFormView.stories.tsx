import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { WalletFormView } from './WalletFormView';
import type { WalletForm } from '../../../domain';

const defaultValues: WalletForm = {
  name: '',
  balance: 0,
  paymentCostPercentage: 0,
  isCashless: false,
};

const LoadedStory = () => {
  const form = useForm<WalletForm>({ defaultValues });
  return (
    <WalletFormView
      variant={{ type: 'loaded' }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
    />
  );
};

const PopulatedStory = () => {
  const form = useForm<WalletForm>({
    defaultValues: {
      name: 'Cash',
      balance: 5000000,
      paymentCostPercentage: 0,
      isCashless: false,
    },
  });
  return (
    <WalletFormView
      variant={{ type: 'loaded' }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
    />
  );
};

const meta: Meta<typeof WalletFormView> = {
  title: 'Features/Wallets/WalletFormView',
  component: WalletFormView,
};

export default meta;
type Story = StoryObj<typeof WalletFormView>;

export const Loaded: Story = {
  render: () => <LoadedStory />,
};

export const Populated: Story = {
  render: () => <PopulatedStory />,
};

const LoadingStory = () => {
  const form = useForm<WalletForm>({ defaultValues });
  return (
    <WalletFormView
      variant={{ type: 'loading' }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
    />
  );
};

const ErrorStory = () => {
  const form = useForm<WalletForm>({ defaultValues });
  return (
    <WalletFormView
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
