import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseUpdateHandler } from './ExpenseUpdateHandler';
import {
  MockAuthRepository,
  MockBudgetRepository,
  MockExpenseRepository,
  MockWalletRepository,
} from '../../data/mock';
import { AuthLogoutUsecase, ExpenseUpdateUsecase } from '../../domain';
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
    expenseId?: number;
    expenseShouldFail?: boolean;
    preloaded?: boolean;
  } = {}
) => {
  const expenseId = options.expenseId ?? 1;
  const expenseRepo = new MockExpenseRepository();
  const budgetRepo = new MockBudgetRepository();
  const walletRepo = new MockWalletRepository();

  if (options.expenseShouldFail) expenseRepo.setShouldFail(true);

  const preloadedExpense = options.preloaded
    ? expenseRepo.expenses.find((e) => e.id === expenseId) ?? null
    : null;
  const preloadedBudgets = options.preloaded ? budgetRepo.budgets : [];
  const preloadedWallets = options.preloaded ? walletRepo.wallets : [];

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    expenseUpdateUsecase: new ExpenseUpdateUsecase(
      expenseRepo,
      budgetRepo,
      walletRepo,
      {
        expenseId,
        expense: preloadedExpense,
        budgets: preloadedBudgets,
        wallets: preloadedWallets,
      }
    ),
  };
};

describe('ExpenseUpdateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state while fetching expense', async () => {
      render(<ExpenseUpdateHandler {...createProps()} />);
      expect(screen.getByText('Fetching Expense...')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show the form after expense data loads', async () => {
      render(<ExpenseUpdateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render the form immediately when expense is preloaded', async () => {
      render(<ExpenseUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show error state when expense fetch fails', async () => {
      render(<ExpenseUpdateHandler {...createProps({ expenseShouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Expense' })).toBeTruthy();
    });
  });

  describe('validation', () => {
    it('should not submit when expense item name is empty', async () => {
      const user = userEvent.setup();
      render(<ExpenseUpdateHandler {...createProps({ preloaded: true })} />);

      const itemNameInput = screen.getByLabelText('Item Name');
      await user.clear(itemNameInput);
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('error banner', () => {
    it('should show error banner when update fails', async () => {
      const user = userEvent.setup();
      const expenseRepo = new MockExpenseRepository();
      const budgetRepo = new MockBudgetRepository();
      const walletRepo = new MockWalletRepository();
      const expenseId = 1;
      const preloadedExpense = expenseRepo.expenses.find((e) => e.id === expenseId) ?? null;
      const expenseUpdateUsecase = new ExpenseUpdateUsecase(
        expenseRepo,
        budgetRepo,
        walletRepo,
        {
          expenseId,
          expense: preloadedExpense,
          budgets: budgetRepo.budgets,
          wallets: walletRepo.wallets,
        }
      );
      expenseRepo.setShouldFail(true);

      render(
        <ExpenseUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          expenseUpdateUsecase={expenseUpdateUsecase}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Failed to submit. Please try again.')).toBeTruthy();
    });

    it('should not show error banner before any submission', () => {
      render(<ExpenseUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.queryByText('Failed to submit. Please try again.')).toBeNull();
    });
  });

  describe('error recovery', () => {
    it('should refetch expense when retry button is pressed after error', async () => {
      const user = userEvent.setup();
      const expenseRepo = new MockExpenseRepository();
      expenseRepo.setShouldFail(true);

      render(
        <ExpenseUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          expenseUpdateUsecase={new ExpenseUpdateUsecase(
            expenseRepo,
            new MockBudgetRepository(),
            new MockWalletRepository(),
            {
              expenseId: 1,
              expense: null,
              budgets: [],
              wallets: [],
            }
          )}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Expense' })).toBeTruthy();

      expenseRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });
  });
});
