import React from 'react';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseStatisticHandler } from './ExpenseStatisticHandler';
import {
  MockBudgetRepository,
  MockExpenseRepository,
  MockExpenseStatisticListQueryRepository,
  MockTransactionRepository,
  MockTransactionStatisticListQueryRepository,
} from '../../data/mock';
import {
  Budget,
  BudgetListUsecase,
  ExpenseStatisticListUsecase,
  TransactionStatisticListUsecase,
} from '../../domain';
import { flushPromises } from '../../utils/testUtils';

jest.mock('solito/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const createProps = (
  options: {
    shouldFail?: boolean;
    expenseRepo?: MockExpenseRepository;
    transactionRepo?: MockTransactionRepository;
    budgetRepo?: MockBudgetRepository;
  } = {}
) => {
  const expenseRepo = options.expenseRepo ?? new MockExpenseRepository();
  if (options.shouldFail) expenseRepo.setShouldFail(true);
  const transactionRepo =
    options.transactionRepo ?? new MockTransactionRepository();
  const budgetRepo = options.budgetRepo ?? new MockBudgetRepository();

  return {
    expenseStatisticListUsecase: new ExpenseStatisticListUsecase(
      expenseRepo,
      new MockExpenseStatisticListQueryRepository(),
      { expenseStatistics: [] }
    ),
    transactionStatisticListUsecase: new TransactionStatisticListUsecase(
      transactionRepo,
      new MockTransactionStatisticListQueryRepository(),
      { transactionStatistics: [] }
    ),
    budgetListUsecase: new BudgetListUsecase(budgetRepo, { budgets: [] }),
  };
};

describe('ExpenseStatisticHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state initially', async () => {
      render(<ExpenseStatisticHandler {...createProps()} />);
      expect(screen.getByText('Fetching Statistics...')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show statistics section after successful fetch', async () => {
      render(<ExpenseStatisticHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', { name: 'Expense Statistic' })
      ).toBeTruthy();
    });

    it('should show view toggle and group by controls after successful fetch', async () => {
      render(<ExpenseStatisticHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'By Budget' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Combined' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Date' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Month' })).toBeTruthy();
    });

    it('should show error state when fetch fails', async () => {
      render(
        <ExpenseStatisticHandler {...createProps({ shouldFail: true })} />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', { name: 'Failed to Fetch Statistics' })
      ).toBeTruthy();
    });
  });

  describe('view toggle', () => {
    it('should switch to combined view without refetching', async () => {
      const user = userEvent.setup();
      const expenseRepo = new MockExpenseRepository();
      const fetchSpy = jest.spyOn(expenseRepo, 'fetchExpenseStatisticList');

      render(<ExpenseStatisticHandler {...createProps({ expenseRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole('button', { name: 'Combined' }));

      await act(async () => {
        await flushPromises();
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('error recovery', () => {
    it('should refetch statistics when retry button is pressed', async () => {
      const user = userEvent.setup();
      const expenseRepo = new MockExpenseRepository();
      expenseRepo.setShouldFail(true);

      render(<ExpenseStatisticHandler {...createProps({ expenseRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', { name: 'Failed to Fetch Statistics' })
      ).toBeTruthy();

      expenseRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', { name: 'Expense Statistic' })
      ).toBeTruthy();
    });
  });

  describe('target vs. actual variance', () => {
    const budget = (overrides: Partial<Budget>): Budget => ({
      id: 1,
      name: 'Budget',
      percentage: 0,
      balance: 0,
      createdAt: '2024-03-20T00:00:00.000Z',
      ...overrides,
    });

    it('shows target %, actual % of revenue, and delta, flagging over-target budgets', async () => {
      const expenseRepo = new MockExpenseRepository();
      expenseRepo.statistics = [
        { date: '2024-01', budgetId: 1, budgetName: 'Restock', total: 3500 },
      ];
      const transactionRepo = new MockTransactionRepository();
      transactionRepo.statistics = [
        { date: '2024-01', total: 10000, totalIncome: 10000 },
      ];
      const budgetRepo = new MockBudgetRepository();
      budgetRepo.budgets = [budget({ id: 1, name: 'Restock', percentage: 30 })];

      render(
        <ExpenseStatisticHandler
          {...createProps({ expenseRepo, transactionRepo, budgetRepo })}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      const varianceList = within(screen.getByTestId('expense-variance-list'));
      expect(varianceList.getByText('Target vs. Actual')).toBeTruthy();
      expect(varianceList.getByText('Restock')).toBeTruthy();
      expect(varianceList.getByText('30.0%')).toBeTruthy();
      expect(varianceList.getByText('35.0%')).toBeTruthy();
      expect(varianceList.getByText('+5.0%')).toBeTruthy();
    });

    it('shows "—" instead of a variance for a budget with no target', async () => {
      const expenseRepo = new MockExpenseRepository();
      expenseRepo.statistics = [
        { date: '2024-01', budgetId: 1, budgetName: 'Misc', total: 1000 },
      ];
      const transactionRepo = new MockTransactionRepository();
      transactionRepo.statistics = [
        { date: '2024-01', total: 10000, totalIncome: 10000 },
      ];
      const budgetRepo = new MockBudgetRepository();
      budgetRepo.budgets = [budget({ id: 1, name: 'Misc', percentage: 0 })];

      render(
        <ExpenseStatisticHandler
          {...createProps({ expenseRepo, transactionRepo, budgetRepo })}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
      expect(screen.getByText('10.0%')).toBeTruthy();
    });

    it('shows absolute amounts instead of percentages for a zero-revenue period', async () => {
      const expenseRepo = new MockExpenseRepository();
      expenseRepo.statistics = [
        { date: '2024-01', budgetId: 1, budgetName: 'Restock', total: 5000 },
      ];
      const transactionRepo = new MockTransactionRepository();
      transactionRepo.statistics = [];
      const budgetRepo = new MockBudgetRepository();
      budgetRepo.budgets = [budget({ id: 1, name: 'Restock', percentage: 30 })];

      render(
        <ExpenseStatisticHandler
          {...createProps({ expenseRepo, transactionRepo, budgetRepo })}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Rp. 5.000')).toBeTruthy();
    });
  });
});
