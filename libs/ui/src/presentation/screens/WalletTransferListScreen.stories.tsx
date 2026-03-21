import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WalletTransferListScreen } from './WalletTransferListScreen';
import { mockWalletTransfers, mockWallet } from '../../../.storybook/mocks/mockData';

const mockTransferItems = mockWalletTransfers.map((t) => ({
  toWalletName: t.toWallet.name,
  amount: t.amount,
  createdAt: t.createdAt,
}));

const defaultArgs = {
  walletId: mockWallet.id,
  onLogoutPress: fn(),
  name: mockWallet.name,
  balance: mockWallet.balance,
  paymentCostPercentage: mockWallet.paymentCostPercentage,
  onRetryButtonPress: fn(),
};

const meta: Meta<typeof WalletTransferListScreen> = {
  title: 'Screens/Wallets/WalletTransferListScreen',
  component: WalletTransferListScreen,
  parameters: { layout: 'fullscreen' },
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof WalletTransferListScreen>;

export const Loaded: Story = {
  args: { variant: { type: 'loaded', items: mockTransferItems } },
};

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Empty: Story = {
  args: { variant: { type: 'error' } },
};

export const Error: Story = {
  args: { variant: { type: 'error' } },
};
