import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  TransactionListParams,
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

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  usePrinter: () => ({ print: jest.fn() }),
  useFocusEffect: () => {
    // no-op
  },
}));

const createProps = (
  transactionRepository: MockTransactionRepository,
  transactionListParams: TransactionListParams
) => ({
  authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
  transactionListUsecase: new TransactionListUsecase(
    transactionRepository,
    new MockTransactionListQueryRepository(),
    new MockWalletRepository(),
    transactionListParams
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
  transactionCompleteUsecase: new TransactionCompleteUsecase(
    transactionRepository
  ),
});

const getRefreshButton = () =>
  screen.getByRole('button', {
    name: 'Refresh transactions',
  }) as HTMLButtonElement;

describe('TransactionListHandler refresh button', () => {
  it('should refetch the current page with the active filters when pressed', async () => {
    const transactionRepository = new MockTransactionRepository();
    const fetchTransactionList = jest.spyOn(
      transactionRepository,
      'fetchTransactionList'
    );

    render(
      <TransactionListHandler
        {...createProps(transactionRepository, {
          transactions: [],
          totalItem: 0,
          wallets: [],
          page: 3,
          query: 'Budi',
          paymentStatus: 'paid',
          source: 'order',
          fulfillment: 'ready',
        })}
      />
    );

    await waitFor(() => expect(getRefreshButton().disabled).toBe(false));
    expect(fetchTransactionList).toHaveBeenCalledTimes(1);

    await transactionRepository.createTransaction({
      name: 'Order App Transaction',
      pagerNumber: 0,
      transactionItems: [],
      transactionCoupons: [],
    } as never);

    fireEvent.click(getRefreshButton());

    await waitFor(() => expect(fetchTransactionList).toHaveBeenCalledTimes(2));
    expect(fetchTransactionList).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 3,
        query: 'Budi',
        paymentStatus: 'paid',
        source: 'order',
        fulfillment: 'ready',
      })
    );
    await waitFor(() =>
      expect(screen.getByText('Order App Transaction')).toBeTruthy()
    );
    expect(getRefreshButton().disabled).toBe(false);
  });

  it('should disable the refresh button while the list is still loading', () => {
    render(
      <TransactionListHandler
        {...createProps(new MockTransactionRepository(), {
          transactions: [],
          totalItem: 0,
          wallets: [],
        })}
      />
    );

    expect(getRefreshButton().disabled).toBe(true);
  });
});
