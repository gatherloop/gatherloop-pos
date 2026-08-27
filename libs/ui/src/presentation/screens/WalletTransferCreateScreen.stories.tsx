import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WalletTransferCreateScreen } from './WalletTransferCreateScreen';
import { mockWallets } from '../../../.storybook/mocks/mockData';

const walletSelectOptions = mockWallets.map((w) => ({ label: w.name, value: w.id }));

const meta: Meta<typeof WalletTransferCreateScreen> = {
  title: 'Screens/Wallets/WalletTransferCreateScreen',
  component: WalletTransferCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof WalletTransferCreateScreen>;

export const Default: Story = {
  args: {
    defaultValues: { amount: 0, fromWalletId: 1, toWalletId: 2 },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
    onLogoutPress: fn(),
    variant: { type: 'loaded' },
    walletSelectOptions,
  },
};
