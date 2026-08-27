import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WalletTransferFormView } from './WalletTransferFormView';

const walletOptions = [
  { label: 'Cash', value: 1 },
  { label: 'Bank Transfer', value: 2 },
  { label: 'QRIS', value: 3 },
];

const meta: Meta<typeof WalletTransferFormView> = {
  title: 'Features/Wallets/WalletTransferFormView',
  component: WalletTransferFormView,
};

export default meta;
type Story = StoryObj<typeof WalletTransferFormView>;

export const Default: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues: { amount: 0, fromWalletId: 1, toWalletId: 2 },
    onSubmit: fn(),
    walletSelectOptions: walletOptions,
    isSubmitDisabled: false,
    isSubmitting: false,
  },
};

export const Populated: Story = {
  args: {
    ...Default.args,
    defaultValues: { amount: 1000000, fromWalletId: 1, toWalletId: 2 },
  },
};

export const SubmitDisabled: Story = {
  args: {
    ...Default.args,
    isSubmitDisabled: true,
  },
};
