import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CalculationListItem } from './CalculationListItem';

const meta: Meta<typeof CalculationListItem> = {
  title: 'Features/Calculations/CalculationListItem',
  component: CalculationListItem,
  args: {
    walletName: 'Cash',
    totalWallet: 5000000,
    totalCalculation: 4980000,
    createdAt: '2024-01-20T10:00:00.000Z',
    completedAt: null,
    onEditMenuPress: fn(),
    onDeleteMenuPress: fn(),
    onCompleteMenuPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CalculationListItem>;

export const Ongoing: Story = {};

export const Completed: Story = {
  args: {
    completedAt: '2024-01-20T11:00:00.000Z',
  },
};

export const WithoutMenus: Story = {
  args: {
    onEditMenuPress: undefined,
    onDeleteMenuPress: undefined,
    onCompleteMenuPress: undefined,
  },
};

export const LargeBalance: Story = {
  args: {
    walletName: 'Bank Transfer',
    totalWallet: 50000000,
    totalCalculation: 49850000,
  },
};
