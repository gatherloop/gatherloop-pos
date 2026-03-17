import React from 'react';
import { render, screen } from '@testing-library/react';
import { BudgetList } from './BudgetList';

const baseProps = {
  onRetryButtonPress: jest.fn(),
};

describe('BudgetList', () => {
  it('should render loading view when variant is loading', () => {
    render(<BudgetList {...baseProps} variant={{ type: 'loading' }} />);
    expect(screen.getByText('Fetching Budgets...')).toBeTruthy();
  });

  it('should render error view when variant is error', () => {
    render(<BudgetList {...baseProps} variant={{ type: 'error' }} />);
    expect(screen.getByText('Failed to Fetch Budgets')).toBeTruthy();
  });

  it('should render empty view when variant is empty', () => {
    render(<BudgetList {...baseProps} variant={{ type: 'empty' }} />);
    expect(screen.getByText('Oops, Budget is Empty')).toBeTruthy();
  });

  it('should render budget items when variant is loaded', () => {
    const items = [
      { id: 1, name: 'Budget 1', balance: 1000, percentage: 10 },
      { id: 2, name: 'Budget 2', balance: 2000, percentage: 20 },
    ];
    render(<BudgetList {...baseProps} variant={{ type: 'loaded', items }} />);
    expect(screen.getByText('Budget 1')).toBeTruthy();
    expect(screen.getByText('Budget 2')).toBeTruthy();
  });
});
