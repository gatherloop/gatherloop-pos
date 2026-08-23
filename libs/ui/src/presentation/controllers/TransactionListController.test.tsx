import { renderHook, waitFor, act } from '@testing-library/react';
import { useTransactionListController } from './TransactionListController';
import {
  MockTransactionRepository,
  MockTransactionListQueryRepository,
  MockWalletRepository,
} from '../../data/mock';
import { TransactionListUsecase } from '../../domain';

// Stand in for the platform `useFocusEffect` so the test can replay a screen
// refocus, which on native happens when a pushed screen is popped and the list
// screen becomes visible again without remounting.
const focusCallbacks: (() => void)[] = [];
jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  useFocusEffect: (callback: () => void) => {
    focusCallbacks.push(callback);
  },
}));

const refocus = () => {
  focusCallbacks.forEach((callback) => callback());
};

const buildUsecase = (transactionRepository: MockTransactionRepository) =>
  new TransactionListUsecase(
    transactionRepository,
    new MockTransactionListQueryRepository(),
    new MockWalletRepository(),
    { transactions: [], totalItem: 0, wallets: [] }
  );

describe('useTransactionListController', () => {
  beforeEach(() => {
    focusCallbacks.length = 0;
  });

  it('should refetch the transaction list when the screen is focused again', async () => {
    const transactionRepository = new MockTransactionRepository();
    const fetchTransactionList = jest.spyOn(
      transactionRepository,
      'fetchTransactionList'
    );
    const usecase = buildUsecase(transactionRepository);

    const { result } = renderHook(() => useTransactionListController(usecase));

    await waitFor(() => expect(result.current.state.type).toBe('loaded'));
    expect(fetchTransactionList).toHaveBeenCalledTimes(1);

    // A transaction created on another screen while this one stayed mounted.
    await transactionRepository.createTransaction({
      name: 'Transaction 3',
      orderNumber: 3,
      transactionItems: [],
      transactionCoupons: [],
    } as never);

    act(() => refocus());

    await waitFor(() => expect(fetchTransactionList).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.state.type).toBe('loaded'));
    expect(result.current.state.transactions).toHaveLength(3);
  });

  it('should keep showing the current list while refetching on focus', async () => {
    const transactionRepository = new MockTransactionRepository();
    const usecase = buildUsecase(transactionRepository);

    const { result } = renderHook(() => useTransactionListController(usecase));

    await waitFor(() => expect(result.current.state.type).toBe('loaded'));

    act(() => refocus());

    // `revalidating` keeps the loaded list on screen instead of falling back to
    // the loading skeleton.
    expect(result.current.state.type).toBe('revalidating');
    expect(result.current.state.transactions).toHaveLength(2);

    await waitFor(() => expect(result.current.state.type).toBe('loaded'));
  });
});
