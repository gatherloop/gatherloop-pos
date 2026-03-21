import type { Meta, StoryObj } from '@storybook/react';
import { WalletTransferListItem } from './WalletTransferListItem';

const meta: Meta<typeof WalletTransferListItem> = {
  title: 'Features/Wallets/WalletTransferListItem',
  component: WalletTransferListItem,
  args: {
    toWalletName: 'Bank Transfer',
    amount: 1000000,
    createdAt: '2024-01-20T10:00:00.000Z',
  },
};

export default meta;
type Story = StoryObj<typeof WalletTransferListItem>;

export const Default: Story = {};

export const LargeTransfer: Story = {
  args: {
    toWalletName: 'QRIS',
    amount: 10000000,
  },
};
