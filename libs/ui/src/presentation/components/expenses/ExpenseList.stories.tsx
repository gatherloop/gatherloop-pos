import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ExpenseList } from './ExpenseList';
import { mockExpenses, mockWallets, mockBudgets } from '../../../../.storybook/mocks/mockData';

const defaultArgs = {
  onRetryButtonPress: fn(),
  onEditMenuPress: fn(),
  onDeleteMenuPress: fn(),
  onItemPress: fn(),
  expenses: mockExpenses,
  searchValue: '',
  onSearchValueChange: fn(),
  currentPage: 1,
  onPageChange: fn(),
  totalItem: 2,
  itemPerPage: 10,
  wallets: mockWallets,
  walletId: null,
  onWalletIdChange: fn(),
  budgets: mockBudgets,
  budgetId: null,
  onBudgetIdChange: fn(),
};

const meta: Meta<typeof ExpenseList> = {
  title: 'Features/Expenses/ExpenseList',
  component: ExpenseList,
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof ExpenseList>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
  },
};

export const Loading: Story = {
  args: {
    variant: { type: 'loading' },
    expenses: [],
  },
};

export const Error: Story = {
  args: {
    variant: { type: 'error' },
    expenses: [],
  },
};

export const FilteredByWallet: Story = {
  args: {
    variant: { type: 'loaded' },
    walletId: 1,
    expenses: mockExpenses.filter((e) => e.wallet.id === 1),
    totalItem: 1,
  },
};

export const FilteredByBudget: Story = {
  args: {
    variant: { type: 'loaded' },
    budgetId: 1,
    expenses: mockExpenses.filter((e) => e.budget.id === 1),
    totalItem: 1,
  },
};
