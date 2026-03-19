import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionStatisticHandler } from './TransactionStatisticHandler';
import {
  MockAuthRepository,
  MockTransactionRepository,
  MockTransactionStatisticListQueryRepository,
} from '../../data/mock';
import {
  AuthLogoutUsecase,
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
    transactionRepo?: MockTransactionRepository;
  } = {}
) => {
  const transactionRepo =
    options.transactionRepo ?? new MockTransactionRepository();
  if (options.shouldFail) transactionRepo.setShouldFail(true);

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    transactionStatisticListUsecase: new TransactionStatisticListUsecase(
      transactionRepo,
      new MockTransactionStatisticListQueryRepository(),
      { transactionStatistics: [] }
    ),
  };
};

describe('TransactionStatisticHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state initially', async () => {
      render(<TransactionStatisticHandler {...createProps()} />);
      expect(screen.getByText('Fetching Statistics...')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show statistics section after successful fetch', async () => {
      render(<TransactionStatisticHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Transaction Statistic' })).toBeTruthy();
    });

    it('should show group by controls after successful fetch', async () => {
      render(<TransactionStatisticHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      // Group by buttons: Date and Month
      expect(screen.getByRole('button', { name: 'Date' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Month' })).toBeTruthy();
    });

    it('should show error state when fetch fails', async () => {
      render(<TransactionStatisticHandler {...createProps({ shouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', { name: 'Failed to Fetch Statistics' })
      ).toBeTruthy();
    });
  });

  describe('error recovery', () => {
    it('should refetch statistics when retry button is pressed', async () => {
      const user = userEvent.setup();
      const transactionRepo = new MockTransactionRepository();
      transactionRepo.setShouldFail(true);

      render(<TransactionStatisticHandler {...createProps({ transactionRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', { name: 'Failed to Fetch Statistics' })
      ).toBeTruthy();

      transactionRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', { name: 'Transaction Statistic' })
      ).toBeTruthy();
    });
  });
});
