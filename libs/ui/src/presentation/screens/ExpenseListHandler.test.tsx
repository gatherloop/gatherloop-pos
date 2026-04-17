import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseListHandler } from './ExpenseListHandler';
import {
  MockAuthRepository,
  MockBudgetRepository,
  MockExpenseRepository,
  MockExpenseListQueryRepository,
  MockWalletRepository,
} from '../../data/mock';
import {
  AuthLogoutUsecase,
  ExpenseDeleteUsecase,
  ExpenseListUsecase,
} from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const createProps = (
  options: {
    expenseRepo?: MockExpenseRepository;
    authRepo?: MockAuthRepository;
  } = {}
) => {
  const expenseRepo = options.expenseRepo ?? new MockExpenseRepository();
  const authRepo = options.authRepo ?? new MockAuthRepository();
  return {
    authLogoutUsecase: new AuthLogoutUsecase(authRepo),
    expenseListUsecase: new ExpenseListUsecase(
      expenseRepo,
      new MockExpenseListQueryRepository(),
      new MockWalletRepository(),
      new MockBudgetRepository(),
      { expenses: [], totalItem: 0, wallets: [], budgets: [] }
    ),
    expenseDeleteUsecase: new ExpenseDeleteUsecase(expenseRepo),
  };
};

describe('ExpenseListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show skeleton list during initial loading', async () => {
      render(<ExpenseListHandler {...createProps()} />);
      expect(screen.getByTestId('skeleton-list')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show expense list after successful fetch', async () => {
      render(<ExpenseListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      // Both mock expenses have budget name "Operating"
      const expenseHeadings = screen.getAllByRole('heading', { name: 'Operating' });
      expect(expenseHeadings.length).toBe(2);
    });

    it('should show error state when fetch fails', async () => {
      const expenseRepo = new MockExpenseRepository();
      expenseRepo.setShouldFail(true);

      render(<ExpenseListHandler {...createProps({ expenseRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Expenses' })).toBeTruthy();
    });

    it('should not show skeleton after data is loaded', async () => {
      render(<ExpenseListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByTestId('skeleton-list')).toBeNull();
    });

    it('should preserve list content during revalidation after delete', async () => {
      const user = userEvent.setup();
      render(<ExpenseListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      await user.click(screen.getByRole('button', { name: 'Yes' }));

      expect(screen.queryByTestId('skeleton-list')).toBeNull();

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByTestId('skeleton-list')).toBeNull();
    });

    it('should show empty state when no expenses exist', async () => {
      const expenseRepo = new MockExpenseRepository();
      expenseRepo.expenses = [];

      render(<ExpenseListHandler {...createProps({ expenseRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Oops, Expense is Empty' })).toBeTruthy();
    });
  });

  describe('delete modal', () => {
    it('should not show delete modal initially', async () => {
      render(<ExpenseListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByText('Delete Expense')).toBeNull();
    });

    it('should show delete modal when delete menu is pressed', async () => {
      const user = userEvent.setup();
      render(<ExpenseListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);

      expect(screen.getByText('Delete Expense')).toBeTruthy();
    });

    it('should hide delete modal when cancel is pressed', async () => {
      const user = userEvent.setup();
      render(<ExpenseListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByText('Delete Expense')).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'No' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByText('Delete Expense')).toBeNull();
    });

    it('should refetch expense list after successful delete', async () => {
      const user = userEvent.setup();
      const expenseRepo = new MockExpenseRepository();
      render(<ExpenseListHandler {...createProps({ expenseRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getAllByRole('heading', { name: 'Operating' }).length).toBe(2);

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByText('Delete Expense')).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByText('Delete Expense')).toBeNull();
      expect(screen.getAllByRole('heading', { name: 'Operating' }).length).toBe(1);
    });
  });

  describe('navigation', () => {
    it('should navigate to expense edit page when edit menu is pressed', async () => {
      const user = userEvent.setup();
      render(<ExpenseListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const editMenuItems = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editMenuItems[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/expenses/1');
    });
  });

  describe('error recovery', () => {
    it('should refetch expenses when retry button is pressed', async () => {
      const user = userEvent.setup();
      const expenseRepo = new MockExpenseRepository();
      expenseRepo.setShouldFail(true);

      render(<ExpenseListHandler {...createProps({ expenseRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Expenses' })).toBeTruthy();

      expenseRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getAllByRole('heading', { name: 'Operating' }).length).toBeGreaterThan(0);
    });
  });
});
