import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BudgetUpdateHandler } from './BudgetUpdateHandler';
import { MockAuthRepository, MockBudgetRepository } from '../../data/mock';
import { AuthLogoutUsecase, BudgetUpdateUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createProps = (options: {
  budgetId?: number;
  shouldFail?: boolean;
  preloaded?: boolean;
} = {}) => {
  const budgetId = options.budgetId ?? 1;
  const budgetRepo = new MockBudgetRepository();
  if (options.shouldFail) budgetRepo.setShouldFail(true);

  const preloadedBudget = options.preloaded
    ? budgetRepo.budgets.find((b) => b.id === budgetId) ?? null
    : null;

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    budgetUpdateUsecase: new BudgetUpdateUsecase(budgetRepo, {
      budgetId,
      budget: preloadedBudget,
    }),
  };
};

describe('BudgetUpdateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state while fetching budget', async () => {
      render(<BudgetUpdateHandler {...createProps()} />);
      expect(screen.getByText('Fetching Budget...')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show the form after budget data loads', async () => {
      render(<BudgetUpdateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render pre-filled form when budget is preloaded', async () => {
      render(<BudgetUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByDisplayValue('Mock Budget 1')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show error state when budget fetch fails', async () => {
      render(<BudgetUpdateHandler {...createProps({ shouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Budget' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/budgets" after successful update', async () => {
      const user = userEvent.setup();
      render(<BudgetUpdateHandler {...createProps({ preloaded: true })} />);

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Budget');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/budgets');
    });

    it('should not navigate when update fails', async () => {
      const user = userEvent.setup();
      const budgetRepo = new MockBudgetRepository();
      const preloadedBudget = budgetRepo.budgets[0];
      const budgetUpdateUsecase = new BudgetUpdateUsecase(budgetRepo, {
        budgetId: preloadedBudget.id,
        budget: preloadedBudget,
      });
      budgetRepo.setShouldFail(true);

      render(
        <BudgetUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          budgetUpdateUsecase={budgetUpdateUsecase}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Budget');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate without user interaction', async () => {
      render(<BudgetUpdateHandler {...createProps({ preloaded: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error message when name field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<BudgetUpdateHandler {...createProps({ preloaded: true })} />);

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('String must contain at least 1 character(s)')).toBeTruthy();
    });
  });

  describe('toast notifications', () => {
    it('should show success toast after successful update', async () => {
      const user = userEvent.setup();
      render(<BudgetUpdateHandler {...createProps({ preloaded: true })} />);

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Budget');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Update Budget Success');
    });

    it('should show error toast when update fails', async () => {
      const user = userEvent.setup();
      const budgetRepo = new MockBudgetRepository();
      const preloadedBudget = budgetRepo.budgets[0];
      const budgetUpdateUsecase = new BudgetUpdateUsecase(budgetRepo, {
        budgetId: preloadedBudget.id,
        budget: preloadedBudget,
      });
      budgetRepo.setShouldFail(true);

      render(
        <BudgetUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          budgetUpdateUsecase={budgetUpdateUsecase}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Budget');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Update Budget Error');
    });
  });

  describe('error banner', () => {
    it('should show error banner when update fails', async () => {
      const user = userEvent.setup();
      const budgetRepo = new MockBudgetRepository();
      const preloadedBudget = budgetRepo.budgets[0];
      const budgetUpdateUsecase = new BudgetUpdateUsecase(budgetRepo, {
        budgetId: preloadedBudget.id,
        budget: preloadedBudget,
      });
      budgetRepo.setShouldFail(true);

      render(
        <BudgetUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          budgetUpdateUsecase={budgetUpdateUsecase}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Budget');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Failed to submit. Please try again.')).toBeTruthy();
    });

    it('should not show error banner before any submission', () => {
      render(<BudgetUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.queryByText('Failed to submit. Please try again.')).toBeNull();
    });
  });
});
