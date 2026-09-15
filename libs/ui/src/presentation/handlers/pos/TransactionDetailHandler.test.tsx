import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionDetailHandler } from './TransactionDetailHandler';
import { MockAuthRepository, MockTransactionRepository } from '../../../data/mock';
import {
  AuthLogoutUsecase,
  TransactionCompleteUsecase,
  TransactionDetailUsecase,
} from '../../../domain';
import { flushPromises } from '../../../utils/testUtils';

jest.mock('solito/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const createProps = (
  options: {
    transactionId?: number;
    shouldFail?: boolean;
    preloaded?: boolean;
    transactionRepo?: MockTransactionRepository;
  } = {}
) => {
  const transactionId = options.transactionId ?? 1;
  const transactionRepo = options.transactionRepo ?? new MockTransactionRepository();
  if (options.shouldFail) transactionRepo.setShouldFail(true);

  const preloadedTransaction = options.preloaded
    ? transactionRepo.transactions.find((t) => t.id === transactionId) ?? null
    : null;

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    transactionDetailUsecase: new TransactionDetailUsecase(transactionRepo, {
      transactionId,
      transaction: preloadedTransaction,
    }),
    transactionCompleteUsecase: new TransactionCompleteUsecase(transactionRepo),
  };
};

describe('TransactionDetailHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('data display', () => {
    it('should show transaction name after successful fetch', async () => {
      render(<TransactionDetailHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Transaction 1')).toBeTruthy();
    });

    it('should show customer name label', async () => {
      render(<TransactionDetailHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Customer Name')).toBeTruthy();
    });

    it('should show order number label when order number is positive', async () => {
      render(<TransactionDetailHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Pager Number')).toBeTruthy();
    });

    it('should show the transaction number', async () => {
      render(<TransactionDetailHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Transaction Number')).toBeTruthy();
    });

    it('should show pre-filled data when transaction is preloaded', () => {
      render(
        <TransactionDetailHandler {...createProps({ preloaded: true })} />
      );

      expect(screen.getByText('Transaction 1')).toBeTruthy();
    });
  });

  describe('transaction items section', () => {
    it('should show transaction items heading after fetch', async () => {
      render(<TransactionDetailHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', { name: 'Transaction Items' })
      ).toBeTruthy();
    });
  });

  describe('mark ready / mark preparing', () => {
    it('should show Mark as Ready for a preparing order transaction', () => {
      render(
        <TransactionDetailHandler
          {...createProps({ transactionId: 2, preloaded: true })}
        />
      );

      expect(screen.getByRole('button', { name: 'Mark as Ready' })).toBeTruthy();
      expect(
        screen.queryByRole('button', { name: 'Mark as Preparing' })
      ).toBeNull();
    });

    it('should not show Mark as Ready or Mark as Preparing for a POS transaction', () => {
      render(
        <TransactionDetailHandler
          {...createProps({ transactionId: 1, preloaded: true })}
        />
      );

      expect(screen.queryByRole('button', { name: 'Mark as Ready' })).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Mark as Preparing' })
      ).toBeNull();
    });

    it('should flip the fulfilment status to Ready after confirming Mark as Ready', async () => {
      const user = userEvent.setup();
      const transactionRepo = new MockTransactionRepository();
      render(
        <TransactionDetailHandler
          {...createProps({ transactionId: 2, preloaded: true, transactionRepo })}
        />
      );

      expect(screen.getByText('Preparing')).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Mark as Ready' }));
      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Ready')).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Mark as Preparing' })
      ).toBeTruthy();
    });

    it('should keep the fulfilment status unchanged when the repository fails', async () => {
      const user = userEvent.setup();
      const transactionRepo = new MockTransactionRepository();
      render(
        <TransactionDetailHandler
          {...createProps({ transactionId: 2, preloaded: true, transactionRepo })}
        />
      );

      transactionRepo.setShouldFail(true);

      await user.click(screen.getByRole('button', { name: 'Mark as Ready' }));
      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Preparing')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Mark as Ready' })).toBeTruthy();
    });
  });
});
