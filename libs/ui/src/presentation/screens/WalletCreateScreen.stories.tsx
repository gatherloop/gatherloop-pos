import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { WalletCreateScreen } from './WalletCreateScreen';
import type { WalletForm } from '../../domain';

const defaultValues: WalletForm = { name: '', balance: 0, paymentCostPercentage: 0, isCashless: false };

const CreateStory = () => {
  const form = useForm<WalletForm>({ defaultValues });
  return (
    <WalletCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
    />
  );
};

const meta: Meta<typeof WalletCreateScreen> = {
  title: 'Screens/Wallets/WalletCreateScreen',
  component: WalletCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof WalletCreateScreen>;

export const Default: Story = { render: () => <CreateStory /> };
