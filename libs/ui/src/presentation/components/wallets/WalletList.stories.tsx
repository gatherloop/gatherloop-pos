import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WalletList } from './WalletList';
import { mockWallets } from '../../../../.storybook/mocks/mockData';

const defaultArgs = {
  onRetryButtonPress: fn(),
  onEditMenuPress: fn(),
  onTransferMenuPress: fn(),
  onItemPress: fn(),
};

const meta: Meta<typeof WalletList> = {
  title: 'Features/Wallets/WalletList',
  component: WalletList,
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof WalletList>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded', items: mockWallets },
  },
};

export const Loading: Story = {
  args: {
    variant: { type: 'loading' },
  },
};

export const Empty: Story = {
  args: {
    variant: { type: 'empty' },
  },
};

export const Error: Story = {
  args: {
    variant: { type: 'error' },
  },
};
