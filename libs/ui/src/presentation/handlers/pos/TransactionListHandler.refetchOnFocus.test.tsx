import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { TransactionListHandler } from './TransactionListHandler';
import {
  MockAuthRepository,
  MockTransactionRepository,
  MockTransactionListQueryRepository,
  MockWalletRepository,
} from '../../../data/mock';
import {
  AuthLogoutUsecase,
  TransactionDeleteUsecase,
  TransactionListUsecase,
  TransactionPayUsecase,
  TransactionUnpayUsecase,
} from '../../../domain';

jest.mock('solito/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const focusCallbacks: (() => void)[] = [];
jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  usePrinter: () => ({ print: jest.fn() }),
  useFocusEffect: (callback: () => void) => {
    focusCallbacks.push(callback);
  },
}));

const refocus = () => {
  focusCallbacks.forEach((callback) => callback());
};

const createProps = (transactionRepository: MockTransactionRepository) => ({
  authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
  transactionListUsecase: new TransactionListUsecase(
    transactionRepository,
    new MockTransactionListQueryRepository(),
    new MockWalletRepository(),
    { transactions: [], totalItem: 0, wallets: [] }
  ),
  transactionDeleteUsecase: new TransactionDeleteUsecase(
    transactionRepository
  ),
  transactionPayUsecase: new TransactionPayUsecase(
    transactionRepository,
    new MockWalletRepository(),
    { wallets: [] }
  ),
  transactionUnpayUsecase: new TransactionUnpayUsecase(transactionRepository),
});

describe('TransactionListHandler refetch on focus', () => {
  beforeEach(() => {
    focusCallbacks.length = 0;
  });

  it('should refetch the transaction list when the screen is focused again', async () => {
    const transactionRepository = new MockTransactionRepository();
    const fetchTransactionList = jest.spyOn(
      transactionRepository,
      'fetchTransactionList'
    );

    render(<TransactionListHandler {...createProps(transactionRepository)} />);

    await waitFor(() => expect(fetchTransactionList).toHaveBeenCalledTimes(1));

    await transactionRepository.createTransaction({
      name: 'Transaction 3',
      orderNumber: 3,
      transactionItems: [],
      transactionCoupons: [],
    } as never);

    act(() => refocus());

    await waitFor(() => expect(fetchTransactionList).toHaveBeenCalledTimes(2));
  });
});
