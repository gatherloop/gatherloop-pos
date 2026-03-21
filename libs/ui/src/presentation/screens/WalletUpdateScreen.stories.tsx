import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { WalletUpdateScreen } from './WalletUpdateScreen';
import type { WalletForm } from '../../domain';

const UpdateStory = () => {
  const form = useForm<WalletForm>({
    defaultValues: { name: 'BCA', balance: 5000000, paymentCostPercentage: 0, isCashless: true },
  });
  return (
    <WalletUpdateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
      variant={{ type: 'loaded' }}
    />
  );
};

const LoadingStory = () => {
  const form = useForm<WalletForm>({
    defaultValues: { name: '', balance: 0, paymentCostPercentage: 0, isCashless: false },
  });
  return (
    <WalletUpdateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      onLogoutPress={fn()}
      variant={{ type: 'loading' }}
    />
  );
};

const meta: Meta<typeof WalletUpdateScreen> = {
  title: 'Screens/Wallets/WalletUpdateScreen',
  component: WalletUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof WalletUpdateScreen>;

export const Default: Story = { render: () => <UpdateStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
