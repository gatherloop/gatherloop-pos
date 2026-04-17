import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BudgetListHandler } from './BudgetListHandler';
import { MockAuthRepository, MockBudgetRepository } from '../../data/mock';
import { AuthLogoutUsecase, BudgetListUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

jest.mock('solito/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const createProps = (
  options: {
    budgetRepo?: MockBudgetRepository;
  } = {}
) => {
  const budgetRepo = options.budgetRepo ?? new MockBudgetRepository();
  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    budgetListUsecase: new BudgetListUsecase(budgetRepo, { budgets: [] }),
  };
};

describe('BudgetListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show skeleton list during initial loading', async () => {
      render(<BudgetListHandler {...createProps()} />);
      expect(screen.getByTestId('skeleton-list')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should not show skeleton after data is loaded', async () => {
      render(<BudgetListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByTestId('skeleton-list')).toBeNull();
    });

    it('should show budget list after successful fetch', async () => {
      render(<BudgetListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Mock Budget 1' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Mock Budget 2' })).toBeTruthy();
    });

    it('should show error state when fetch fails', async () => {
      const budgetRepo = new MockBudgetRepository();
      budgetRepo.setShouldFail(true);

      render(<BudgetListHandler {...createProps({ budgetRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Budgets' })).toBeTruthy();
    });

    it('should show empty state when no budgets exist', async () => {
      const budgetRepo = new MockBudgetRepository();
      budgetRepo.budgets = [];

      render(<BudgetListHandler {...createProps({ budgetRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Oops, Budget is Empty' })).toBeTruthy();
    });
  });

  describe('error recovery', () => {
    it('should refetch budgets when retry button is pressed', async () => {
      const user = userEvent.setup();
      const budgetRepo = new MockBudgetRepository();
      budgetRepo.setShouldFail(true);

      render(<BudgetListHandler {...createProps({ budgetRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Budgets' })).toBeTruthy();

      budgetRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Mock Budget 1' })).toBeTruthy();
    });
  });
});
