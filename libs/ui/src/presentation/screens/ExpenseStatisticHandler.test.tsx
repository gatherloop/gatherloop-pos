import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseStatisticHandler } from './ExpenseStatisticHandler';
import {
  MockExpenseRepository,
  MockExpenseStatisticListQueryRepository,
} from '../../data/mock';
import { ExpenseStatisticListUsecase } from '../../domain';
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
  } = {}
) => {
  const expenseRepo = options.expenseRepo ?? new MockExpenseRepository();
  if (options.shouldFail) expenseRepo.setShouldFail(true);

  return {
    expenseStatisticListUsecase: new ExpenseStatisticListUsecase(
      expenseRepo,
      new MockExpenseStatisticListQueryRepository(),
      { expenseStatistics: [] }
    ),
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
});
