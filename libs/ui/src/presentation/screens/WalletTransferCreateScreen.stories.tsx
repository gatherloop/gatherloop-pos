import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { WalletTransferCreateScreen } from './WalletTransferCreateScreen';
import type { WalletTransferForm } from '../../domain';
import { mockWallets } from '../../../.storybook/mocks/mockData';

const walletSelectOptions = mockWallets.map((w) => ({ label: w.name, value: w.id }));

const CreateStory = () => {
  const form = useForm<WalletTransferForm>({
    defaultValues: { amount: 0, fromWalletId: 1, toWalletId: 2 },
  });
  return (
    <WalletTransferCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
      walletSelectOptions={walletSelectOptions}
    />
  );
};

const meta: Meta<typeof WalletTransferCreateScreen> = {
  title: 'Screens/Wallets/WalletTransferCreateScreen',
  component: WalletTransferCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof WalletTransferCreateScreen>;

export const Default: Story = { render: () => <CreateStory /> };
