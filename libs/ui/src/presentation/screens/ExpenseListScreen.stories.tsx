import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ExpenseListScreen } from './ExpenseListScreen';
import {
  mockExpenses,
  mockWallets,
  mockBudgets,
} from '../../../.storybook/mocks/mockData';

const defaultArgs = {
  onLogoutPress: fn(),
  onEditMenuPress: fn(),
  onDeleteMenuPress: fn(),
  onItemPress: fn(),
  onRetryButtonPress: fn(),
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
  isDeleteModalOpen: false,
  isDeleteButtonDisabled: false,
  onDeleteCancel: fn(),
  onDeleteButtonConfirmPress: fn(),
};

const meta: Meta<typeof ExpenseListScreen> = {
  title: 'Screens/Expenses/ExpenseListScreen',
  component: ExpenseListScreen,
  parameters: { layout: 'fullscreen' },
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof ExpenseListScreen>;

export const Loaded: Story = {
  args: { variant: { type: 'loaded' } },
};

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Error: Story = {
  args: { variant: { type: 'error' } },
};

export const DeleteModalOpen: Story = {
  args: {
    variant: { type: 'loaded' },
    isDeleteModalOpen: true,
  },
};
