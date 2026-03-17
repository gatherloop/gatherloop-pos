import React from 'react';
import { render, screen } from '@testing-library/react';
import { ExpenseList } from './ExpenseList';
import { Expense } from '../../../domain';

const baseProps = {
  onRetryButtonPress: jest.fn(),
  onEditMenuPress: jest.fn(),
  onDeleteMenuPress: jest.fn(),
  onItemPress: jest.fn(),
  searchValue: '',
  onSearchValueChange: jest.fn(),
  currentPage: 1,
  onPageChange: jest.fn(),
  totalItem: 0,
  itemPerPage: 10,
  wallets: [],
  walletId: null,
  onWalletIdChange: jest.fn(),
  budgets: [],
  budgetId: null,
  onBudgetIdChange: jest.fn(),
};

const mockWallet = {
  id: 1,
  name: 'Cash',
  balance: 50000,
  paymentCostPercentage: 0,
  isCashless: false,
  createdAt: '2024-01-01',
};

const mockBudget = {
  id: 1,
  name: 'Food Budget',
  balance: 100000,
  percentage: 30,
  createdAt: '2024-01-01',
};

const mockExpense: Expense = {
  id: 1,
  createdAt: '2024-01-01T00:00:00Z',
  wallet: mockWallet,
  budget: mockBudget,
  total: 50000,
  expenseItems: [],
};

describe('ExpenseList', () => {
  it('should render loading view when variant is loading', () => {
    render(<ExpenseList {...baseProps} expenses={[]} variant={{ type: 'loading' }} />);
    expect(screen.getByText('Fetching Expenses...')).toBeTruthy();
  });

  it('should render error view when variant is error', () => {
    render(<ExpenseList {...baseProps} expenses={[]} variant={{ type: 'error' }} />);
    expect(screen.getByText('Failed to Fetch Expenses')).toBeTruthy();
  });

  it('should render empty view when variant is loaded with no expenses', () => {
    render(<ExpenseList {...baseProps} expenses={[]} variant={{ type: 'loaded' }} />);
    expect(screen.getByText('Oops, Expense is Empty')).toBeTruthy();
  });

  it('should render expense items when variant is loaded with expenses', () => {
    const expenses = [
      mockExpense,
      { ...mockExpense, id: 2, budget: { ...mockBudget, name: 'Transport Budget' } },
    ];
    render(<ExpenseList {...baseProps} expenses={expenses} variant={{ type: 'loaded' }} />);
    expect(screen.getByText('Food Budget')).toBeTruthy();
    expect(screen.getByText('Transport Budget')).toBeTruthy();
  });
});
