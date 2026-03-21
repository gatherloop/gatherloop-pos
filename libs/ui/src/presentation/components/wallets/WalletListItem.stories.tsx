import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WalletListItem } from './WalletListItem';

const meta: Meta<typeof WalletListItem> = {
  title: 'Features/Wallets/WalletListItem',
  component: WalletListItem,
  args: {
    name: 'Cash',
    balance: 5000000,
    paymentCostPercentage: 0,
    onTransferMenuPress: fn(),
    onEditMenuPress: fn(),
    onDeleteMenuPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof WalletListItem>;

export const Default: Story = {};

export const Cashless: Story = {
  args: {
    name: 'Bank Transfer',
    balance: 25000000,
    paymentCostPercentage: 1.5,
  },
};

export const QRIS: Story = {
  args: {
    name: 'QRIS',
    balance: 8000000,
    paymentCostPercentage: 0.7,
  },
};

export const WithoutMenus: Story = {
  args: {
    onTransferMenuPress: undefined,
    onEditMenuPress: undefined,
    onDeleteMenuPress: undefined,
  },
};
