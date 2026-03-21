import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WalletTransferList } from './WalletTransferList';

const mockItems = [
  {
    toWalletName: 'Bank Transfer',
    amount: 1000000,
    createdAt: '2024-01-20T10:00:00.000Z',
  },
  {
    toWalletName: 'QRIS',
    amount: 2500000,
    createdAt: '2024-01-21T09:00:00.000Z',
  },
];

const meta: Meta<typeof WalletTransferList> = {
  title: 'Features/Wallets/WalletTransferList',
  component: WalletTransferList,
  args: {
    onRetryButtonPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof WalletTransferList>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded', items: mockItems },
  },
};

export const Loading: Story = {
  args: {
    variant: { type: 'loading' },
  },
};

export const Error: Story = {
  args: {
    variant: { type: 'error' },
  },
};
