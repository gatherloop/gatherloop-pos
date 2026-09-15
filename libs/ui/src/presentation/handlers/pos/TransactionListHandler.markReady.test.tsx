import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionListHandler } from './TransactionListHandler';
import {
  MockAuthRepository,
  MockTransactionRepository,
  MockTransactionListQueryRepository,
  MockWalletRepository,
} from '../../../data/mock';
import {
  AuthLogoutUsecase,
  TransactionCompleteUsecase,
  TransactionDeleteUsecase,
  TransactionListUsecase,
  TransactionPayUsecase,
  TransactionUnpayUsecase,
} from '../../../domain';
import { flushPromises } from '../../../utils/testUtils';

jest.mock('solito/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const createProps = (transactionRepo: MockTransactionRepository) => ({
  authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
  transactionListUsecase: new TransactionListUsecase(
    transactionRepo,
    new MockTransactionListQueryRepository(),
    new MockWalletRepository(),
    { transactions: [], totalItem: 0, wallets: [] }
  ),
  transactionDeleteUsecase: new TransactionDeleteUsecase(transactionRepo),
  transactionPayUsecase: new TransactionPayUsecase(
    transactionRepo,
    new MockWalletRepository(),
    { wallets: [] }
  ),
  transactionUnpayUsecase: new TransactionUnpayUsecase(transactionRepo),
  transactionCompleteUsecase: new TransactionCompleteUsecase(transactionRepo),
});

describe('TransactionListHandler mark ready / mark preparing', () => {
  it('flips the badge to Ready after pressing Mark as Ready and confirming', async () => {
    const user = userEvent.setup();
    const transactionRepo = new MockTransactionRepository();

    render(<TransactionListHandler {...createProps(transactionRepo)} />);

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Preparing')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Mark as Ready' }));
    await user.click(screen.getByRole('button', { name: 'Yes' }));

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Ready')).toBeTruthy();
    expect(screen.queryByText('Preparing')).toBeNull();
  });

  it('does not show Mark as Ready or Mark as Preparing on a POS row', async () => {
    const transactionRepo = new MockTransactionRepository();
    transactionRepo.transactions = transactionRepo.transactions.filter(
      (t) => t.source === 'pos'
    );

    render(<TransactionListHandler {...createProps(transactionRepo)} />);

    await act(async () => {
      await flushPromises();
    });

    expect(screen.queryByRole('button', { name: 'Mark as Ready' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Mark as Preparing' })
    ).toBeNull();
  });

  it('keeps the badge unchanged when the repository fails to complete', async () => {
    const user = userEvent.setup();
    const transactionRepo = new MockTransactionRepository();

    render(<TransactionListHandler {...createProps(transactionRepo)} />);

    await act(async () => {
      await flushPromises();
    });

    transactionRepo.setShouldFail(true);

    await user.click(screen.getByRole('button', { name: 'Mark as Ready' }));
    await user.click(screen.getByRole('button', { name: 'Yes' }));

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Preparing')).toBeTruthy();
    expect(screen.queryByText('Ready')).toBeNull();
  });
});
