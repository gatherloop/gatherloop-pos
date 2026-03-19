import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { TransactionDetailHandler } from './TransactionDetailHandler';
import { MockAuthRepository, MockTransactionRepository } from '../../data/mock';
import { AuthLogoutUsecase, TransactionDetailUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

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
  } = {}
) => {
  const transactionId = options.transactionId ?? 1;
  const transactionRepo = new MockTransactionRepository();
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

      // Transaction 1 has orderNumber: 1 (> 0), so the label is shown
      expect(screen.getByText('Order Number')).toBeTruthy();
    });

    it('should show pre-filled data when transaction is preloaded', () => {
      render(<TransactionDetailHandler {...createProps({ preloaded: true })} />);

      expect(screen.getByText('Transaction 1')).toBeTruthy();
    });
  });

  describe('transaction items section', () => {
    it('should show transaction items heading after fetch', async () => {
      render(<TransactionDetailHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Transaction Items' })).toBeTruthy();
    });

    it('should show transaction coupons heading after fetch', async () => {
      render(<TransactionDetailHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Transaction Coupons' })).toBeTruthy();
    });
  });
});
