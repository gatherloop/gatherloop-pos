import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WalletListScreen } from './WalletListScreen';
import { mockWallets } from '../../../.storybook/mocks/mockData';

const defaultArgs = {
  onLogoutPress: fn(),
  onEditMenuPress: fn(),
  onItemPress: fn(),
  onTransferMenuPress: fn(),
  onRetryButtonPress: fn(),
};

const meta: Meta<typeof WalletListScreen> = {
  title: 'Screens/Wallets/WalletListScreen',
  component: WalletListScreen,
  parameters: { layout: 'fullscreen' },
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof WalletListScreen>;

export const Loaded: Story = {
  args: { variant: { type: 'loaded', items: mockWallets } },
};

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Empty: Story = {
  args: { variant: { type: 'empty' } },
};

export const Error: Story = {
  args: { variant: { type: 'error' } },
};
