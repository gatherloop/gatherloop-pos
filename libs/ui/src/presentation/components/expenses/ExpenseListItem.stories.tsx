import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ExpenseListItem } from './ExpenseListItem';

const meta: Meta<typeof ExpenseListItem> = {
  title: 'Features/Expenses/ExpenseListItem',
  component: ExpenseListItem,
  args: {
    budgetName: 'Raw Materials',
    total: 315000,
    createdAt: '2024-01-20T10:00:00.000Z',
    walletName: 'Cash',
    onEditMenuPress: fn(),
    onDeleteMenuPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ExpenseListItem>;

export const Default: Story = {};

export const WithoutMenus: Story = {
  args: {
    onEditMenuPress: undefined,
    onDeleteMenuPress: undefined,
  },
};

export const LargeExpense: Story = {
  args: {
    budgetName: 'Marketing',
    total: 500000,
    walletName: 'Bank Transfer',
  },
};
