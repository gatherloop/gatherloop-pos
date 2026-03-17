import {
  TransactionListUsecase,
  TransactionListAction,
  TransactionListState,
  TransactionListParams,
} from './transactionList';
import {
  MockTransactionRepository,
  MockTransactionListQueryRepository,
  MockWalletRepository,
} from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TransactionListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → revalidating → loaded → changingParams', async () => {
      const repository = new MockTransactionRepository();
      const transactionListQueryRepository =
        new MockTransactionListQueryRepository();
      const walletRepository = new MockWalletRepository();
      const usecase = new TransactionListUsecase(
        repository,
        transactionListQueryRepository,
        walletRepository,
        { transactions: [], totalItem: 0, wallets: [] }
      );

      const transactionList = new UsecaseTester<
        TransactionListUsecase,
        TransactionListState,
        TransactionListAction,
        TransactionListParams
      >(usecase);

      expect(transactionList.state).toEqual({
        type: 'loading',
        transactions: [],
        totalItem: 0,
        wallets: [],
        walletId: null,
        page: transactionListQueryRepository.getPage(),
        query: transactionListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: transactionListQueryRepository.getSortBy(),
        orderBy: transactionListQueryRepository.getOrderBy(),
        paymentStatus: transactionListQueryRepository.getPaymentStatus(),
        itemPerPage: transactionListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      await flushPromises();
      expect(transactionList.state).toEqual({
        type: 'loaded',
        transactions: repository.transactions,
        totalItem: repository.transactions.length,
        wallets: walletRepository.wallets,
        walletId: null,
        page: transactionListQueryRepository.getPage(),
        query: transactionListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: transactionListQueryRepository.getSortBy(),
        orderBy: transactionListQueryRepository.getOrderBy(),
        paymentStatus: transactionListQueryRepository.getPaymentStatus(),
        itemPerPage: transactionListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      transactionList.dispatch({ type: 'FETCH' });
      expect(transactionList.state).toEqual({
        type: 'revalidating',
        transactions: repository.transactions,
        totalItem: repository.transactions.length,
        wallets: walletRepository.wallets,
        walletId: null,
        page: transactionListQueryRepository.getPage(),
        query: transactionListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: transactionListQueryRepository.getSortBy(),
        orderBy: transactionListQueryRepository.getOrderBy(),
        paymentStatus: transactionListQueryRepository.getPaymentStatus(),
        itemPerPage: transactionListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      await flushPromises();
      expect(transactionList.state).toEqual({
        type: 'loaded',
        transactions: repository.transactions,
        totalItem: repository.transactions.length,
        wallets: walletRepository.wallets,
        walletId: null,
        page: transactionListQueryRepository.getPage(),
        query: transactionListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: transactionListQueryRepository.getSortBy(),
        orderBy: transactionListQueryRepository.getOrderBy(),
        paymentStatus: transactionListQueryRepository.getPaymentStatus(),
        itemPerPage: transactionListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      transactionList.dispatch({ type: 'CHANGE_PARAMS', page: 2 });
      expect(transactionList.state).toEqual({
        type: 'changingParams',
        transactions: repository.transactions,
        totalItem: repository.transactions.length,
        wallets: walletRepository.wallets,
        walletId: null,
        page: 2,
        query: transactionListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: transactionListQueryRepository.getSortBy(),
        orderBy: transactionListQueryRepository.getOrderBy(),
        paymentStatus: transactionListQueryRepository.getPaymentStatus(),
        itemPerPage: transactionListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });
  });

  describe('error flow', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const transactionRepository = new MockTransactionRepository();
      transactionRepository.setShouldFail(true);
      const transactionListQueryRepository =
        new MockTransactionListQueryRepository();
      const walletRepository = new MockWalletRepository();
      const usecase = new TransactionListUsecase(
        transactionRepository,
        transactionListQueryRepository,
        walletRepository,
        { transactions: [], totalItem: 0, wallets: [] }
      );
      const transactionList = new UsecaseTester<
        TransactionListUsecase,
        TransactionListState,
        TransactionListAction,
        TransactionListParams
      >(usecase);

      expect(transactionList.state).toEqual({
        type: 'loading',
        transactions: [],
        totalItem: 0,
        wallets: [],
        walletId: null,
        page: transactionListQueryRepository.getPage(),
        query: transactionListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: transactionListQueryRepository.getSortBy(),
        orderBy: transactionListQueryRepository.getOrderBy(),
        paymentStatus: transactionListQueryRepository.getPaymentStatus(),
        itemPerPage: transactionListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      await flushPromises();
      expect(transactionList.state).toEqual({
        type: 'error',
        transactions: [],
        totalItem: 0,
        wallets: [],
        walletId: null,
        page: transactionListQueryRepository.getPage(),
        query: transactionListQueryRepository.getSearchQuery(),
        errorMessage: 'Failed to fetch transactions',
        sortBy: transactionListQueryRepository.getSortBy(),
        orderBy: transactionListQueryRepository.getOrderBy(),
        paymentStatus: transactionListQueryRepository.getPaymentStatus(),
        itemPerPage: transactionListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      transactionRepository.setShouldFail(false);
      transactionList.dispatch({ type: 'FETCH' });
      expect(transactionList.state).toEqual({
        type: 'loading',
        transactions: [],
        totalItem: 0,
        wallets: [],
        walletId: null,
        page: transactionListQueryRepository.getPage(),
        query: transactionListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: transactionListQueryRepository.getSortBy(),
        orderBy: transactionListQueryRepository.getOrderBy(),
        paymentStatus: transactionListQueryRepository.getPaymentStatus(),
        itemPerPage: transactionListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      await flushPromises();
      expect(transactionList.state).toEqual({
        type: 'loaded',
        transactions: transactionRepository.transactions,
        totalItem: transactionRepository.transactions.length,
        wallets: walletRepository.wallets,
        walletId: null,
        page: transactionListQueryRepository.getPage(),
        query: transactionListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: transactionListQueryRepository.getSortBy(),
        orderBy: transactionListQueryRepository.getOrderBy(),
        paymentStatus: transactionListQueryRepository.getPaymentStatus(),
        itemPerPage: transactionListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });
  });

  it('should show loaded state when initial data is given', async () => {
    const transactionRepository = new MockTransactionRepository();
    const transactionListQueryRepository =
      new MockTransactionListQueryRepository();
    const walletRepository = new MockWalletRepository();
    const transactions = [transactionRepository.transactions[0]];
    const usecase = new TransactionListUsecase(
      transactionRepository,
      transactionListQueryRepository,
      walletRepository,
      { transactions, totalItem: 1, wallets: [] }
    );
    const transactionList = new UsecaseTester<
      TransactionListUsecase,
      TransactionListState,
      TransactionListAction,
      TransactionListParams
    >(usecase);

    expect(transactionList.state.type).toBe('loaded');
    expect(transactionList.state.transactions).toEqual(transactions);
    expect(transactionList.state.totalItem).toBe(transactions.length);
  });
});
