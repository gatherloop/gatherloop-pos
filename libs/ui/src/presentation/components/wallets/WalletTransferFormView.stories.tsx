import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { WalletTransferFormView } from './WalletTransferFormView';
import type { WalletTransferForm } from '../../../domain';

const walletOptions = [
  { label: 'Cash', value: 1 },
  { label: 'Bank Transfer', value: 2 },
  { label: 'QRIS', value: 3 },
];

const defaultValues: WalletTransferForm = {
  amount: 0,
  fromWalletId: 1,
  toWalletId: 2,
};

const LoadedStory = () => {
  const form = useForm<WalletTransferForm>({ defaultValues });
  return (
    <WalletTransferFormView
      form={form}
      onSubmit={fn()}
      walletSelectOptions={walletOptions}
      isSubmitDisabled={false}
    />
  );
};

const PopulatedStory = () => {
  const form = useForm<WalletTransferForm>({
    defaultValues: { amount: 1000000, fromWalletId: 1, toWalletId: 2 },
  });
  return (
    <WalletTransferFormView
      form={form}
      onSubmit={fn()}
      walletSelectOptions={walletOptions}
      isSubmitDisabled={false}
    />
  );
};

const meta: Meta<typeof WalletTransferFormView> = {
  title: 'Features/Wallets/WalletTransferFormView',
  component: WalletTransferFormView,
};

export default meta;
type Story = StoryObj<typeof WalletTransferFormView>;

export const Default: Story = {
  render: () => <LoadedStory />,
};

export const Populated: Story = {
  render: () => <PopulatedStory />,
};

export const SubmitDisabled: Story = {
  render: () => {
    const form = useForm<WalletTransferForm>({ defaultValues });
    return (
      <WalletTransferFormView
        form={form}
        onSubmit={fn()}
        walletSelectOptions={walletOptions}
        isSubmitDisabled={true}
      />
    );
  },
};
