import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseCreateHandler } from './ExpenseCreateHandler';
import {
  MockAuthRepository,
  MockBudgetRepository,
  MockExpenseRepository,
  MockWalletRepository,
} from '../../data/mock';
import { AuthLogoutUsecase, ExpenseCreateUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createProps = (
  options: {
    expenseShouldFail?: boolean;
    walletShouldFail?: boolean;
    budgetShouldFail?: boolean;
    preloaded?: boolean;
  } = {}
) => {
  const expenseRepo = new MockExpenseRepository();
  const walletRepo = new MockWalletRepository();
  const budgetRepo = new MockBudgetRepository();

  if (options.expenseShouldFail) expenseRepo.setShouldFail(true);
  if (options.walletShouldFail) walletRepo.setShouldFail(true);
  if (options.budgetShouldFail) budgetRepo.setShouldFail(true);

  const preloadedBudgets = options.preloaded ? budgetRepo.budgets : [];
  const preloadedWallets = options.preloaded ? walletRepo.wallets : [];

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    expenseCreateUsecase: new ExpenseCreateUsecase(
      expenseRepo,
      budgetRepo,
      walletRepo,
      { budgets: preloadedBudgets, wallets: preloadedWallets }
    ),
  };
};

describe('ExpenseCreateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state while fetching wallets and budgets', () => {
      render(<ExpenseCreateHandler {...createProps()} />);
      expect(screen.getByText('Fetching Expense...')).toBeTruthy();
    });

    it('should show the form after wallets and budgets are fetched', async () => {
      render(<ExpenseCreateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should show error state when wallet fetch fails', async () => {
      render(<ExpenseCreateHandler {...createProps({ walletShouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Expense' })).toBeTruthy();
    });

    it('should render the form immediately when wallets and budgets are preloaded', () => {
      render(<ExpenseCreateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });
  });

  describe('validation', () => {
    it('should show error when no expense items are added and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<ExpenseCreateHandler {...createProps({ preloaded: true })} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Array must contain at least 1 element(s)')).toBeTruthy();
    });

    it('should not navigate when validation fails', async () => {
      const user = userEvent.setup();
      render(<ExpenseCreateHandler {...createProps({ preloaded: true })} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('error recovery', () => {
    it('should retry fetching when retry button is pressed after error', async () => {
      const user = userEvent.setup();
      render(<ExpenseCreateHandler {...createProps({ walletShouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Expense' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      // Still error since walletShouldFail stays true
      expect(screen.getByRole('heading', { name: 'Failed to Fetch Expense' })).toBeTruthy();
    });
  });
});
