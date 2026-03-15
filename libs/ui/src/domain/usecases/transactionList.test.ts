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
import { UsecaseTester } from '../../utils/usecase';

describe('TransactionListUsecase', () => {
  let transactionRepository: MockTransactionRepository;
  let transactionListQueryRepository: MockTransactionListQueryRepository;
  let walletRepository: MockWalletRepository;

  beforeEach(() => {
    transactionRepository = new MockTransactionRepository();
    transactionListQueryRepository = new MockTransactionListQueryRepository();
    walletRepository = new MockWalletRepository();
  });

  describe('success flow', () => {
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

    let transactionList: UsecaseTester<
      TransactionListUsecase,
      TransactionListState,
      TransactionListAction,
      TransactionListParams
    >;

    it('initialize with loading state', () => {
      transactionList = new UsecaseTester<
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
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
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
    });

    it('transition to revalidating state when FETCH action is dispatched', () => {
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
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
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
    });

    it('transition to changingParams state after CHANGE_PARAMS action is dispatched', () => {
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
    let transactionList: UsecaseTester<
      TransactionListUsecase,
      TransactionListState,
      TransactionListAction,
      TransactionListParams
    >;

    it('initialize with loading state', () => {
      transactionList = new UsecaseTester<
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
    });

    it('transition to error state after failed fetch', async () => {
      await Promise.resolve();
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
    });

    it('transition to loading state when FETCH action is dispatched', () => {
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
    });

    it('transition to loaded state after successful fetch', async () => {
      await Promise.resolve();
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
