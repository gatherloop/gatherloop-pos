import {
  ExpenseListUsecase,
  ExpenseListAction,
  ExpenseListState,
  ExpenseListParams,
} from './expenseList';
import {
  MockExpenseRepository,
  MockExpenseListQueryRepository,
  MockWalletRepository,
  MockBudgetRepository,
} from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('ExpenseListUsecase', () => {
  let expenseRepository: MockExpenseRepository;
  let expenseListQueryRepository: MockExpenseListQueryRepository;
  let walletRepository: MockWalletRepository;
  let budgetRepository: MockBudgetRepository;

  beforeEach(() => {
    expenseRepository = new MockExpenseRepository();
    expenseListQueryRepository = new MockExpenseListQueryRepository();
    walletRepository = new MockWalletRepository();
    budgetRepository = new MockBudgetRepository();
  });

  describe('success flow', () => {
    const repository = new MockExpenseRepository();
    const expenseListQueryRepository = new MockExpenseListQueryRepository();
    const walletRepository = new MockWalletRepository();
    const budgetRepository = new MockBudgetRepository();
    const usecase = new ExpenseListUsecase(
      repository,
      expenseListQueryRepository,
      walletRepository,
      budgetRepository,
      { expenses: [], totalItem: 0, wallets: [], budgets: [] }
    );

    let expenseList: UsecaseTester<
      ExpenseListUsecase,
      ExpenseListState,
      ExpenseListAction,
      ExpenseListParams
    >;

    it('initialize with loading state', () => {
      expenseList = new UsecaseTester<
        ExpenseListUsecase,
        ExpenseListState,
        ExpenseListAction,
        ExpenseListParams
      >(usecase);

      expect(expenseList.state).toEqual({
        type: 'loading',
        expenses: [],
        totalItem: 0,
        wallets: [],
        walletId: expenseListQueryRepository.getWalletId(),
        budgets: [],
        budgetId: expenseListQueryRepository.getBudgetId(),
        page: expenseListQueryRepository.getPage(),
        query: expenseListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: expenseListQueryRepository.getSortBy(),
        orderBy: expenseListQueryRepository.getOrderBy(),
        itemPerPage: expenseListQueryRepository.getItemPerPage(),
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(expenseList.state).toEqual({
        type: 'loaded',
        expenses: repository.expenses,
        totalItem: repository.expenses.length,
        wallets: walletRepository.wallets,
        walletId: expenseListQueryRepository.getWalletId(),
        budgets: budgetRepository.budgets,
        budgetId: expenseListQueryRepository.getBudgetId(),
        page: expenseListQueryRepository.getPage(),
        query: expenseListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: expenseListQueryRepository.getSortBy(),
        orderBy: expenseListQueryRepository.getOrderBy(),
        itemPerPage: expenseListQueryRepository.getItemPerPage(),
      });
    });

    it('transition to revalidating state when FETCH action is dispatched', () => {
      expenseList.dispatch({ type: 'FETCH' });
      expect(expenseList.state).toEqual({
        type: 'revalidating',
        expenses: repository.expenses,
        totalItem: repository.expenses.length,
        wallets: walletRepository.wallets,
        walletId: expenseListQueryRepository.getWalletId(),
        budgets: budgetRepository.budgets,
        budgetId: expenseListQueryRepository.getBudgetId(),
        page: expenseListQueryRepository.getPage(),
        query: expenseListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: expenseListQueryRepository.getSortBy(),
        orderBy: expenseListQueryRepository.getOrderBy(),
        itemPerPage: expenseListQueryRepository.getItemPerPage(),
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(expenseList.state).toEqual({
        type: 'loaded',
        expenses: repository.expenses,
        totalItem: repository.expenses.length,
        wallets: walletRepository.wallets,
        walletId: expenseListQueryRepository.getWalletId(),
        budgets: budgetRepository.budgets,
        budgetId: expenseListQueryRepository.getBudgetId(),
        page: expenseListQueryRepository.getPage(),
        query: expenseListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: expenseListQueryRepository.getSortBy(),
        orderBy: expenseListQueryRepository.getOrderBy(),
        itemPerPage: expenseListQueryRepository.getItemPerPage(),
      });
    });

    it('transition to changingParams state after CHANGE_PARAMS action is dispatched', () => {
      expenseList.dispatch({ type: 'CHANGE_PARAMS', page: 2 });
      expect(expenseList.state).toEqual({
        type: 'changingParams',
        expenses: repository.expenses,
        totalItem: repository.expenses.length,
        wallets: walletRepository.wallets,
        walletId: expenseListQueryRepository.getWalletId(),
        budgets: budgetRepository.budgets,
        budgetId: expenseListQueryRepository.getBudgetId(),
        page: 2,
        query: expenseListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: expenseListQueryRepository.getSortBy(),
        orderBy: expenseListQueryRepository.getOrderBy(),
        itemPerPage: expenseListQueryRepository.getItemPerPage(),
      });
    });
  });

  describe('error flow', () => {
    const expenseRepository = new MockExpenseRepository();
    expenseRepository.setShouldFail(true);
    const expenseListQueryRepository = new MockExpenseListQueryRepository();
    const walletRepository = new MockWalletRepository();
    const budgetRepository = new MockBudgetRepository();
    const usecase = new ExpenseListUsecase(
      expenseRepository,
      expenseListQueryRepository,
      walletRepository,
      budgetRepository,
      { expenses: [], totalItem: 0, wallets: [], budgets: [] }
    );
    let expenseList: UsecaseTester<
      ExpenseListUsecase,
      ExpenseListState,
      ExpenseListAction,
      ExpenseListParams
    >;

    it('initialize with loading state', () => {
      expenseList = new UsecaseTester<
        ExpenseListUsecase,
        ExpenseListState,
        ExpenseListAction,
        ExpenseListParams
      >(usecase);

      expect(expenseList.state).toEqual({
        type: 'loading',
        expenses: [],
        totalItem: 0,
        wallets: [],
        walletId: expenseListQueryRepository.getWalletId(),
        budgets: [],
        budgetId: expenseListQueryRepository.getBudgetId(),
        page: expenseListQueryRepository.getPage(),
        query: expenseListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: expenseListQueryRepository.getSortBy(),
        orderBy: expenseListQueryRepository.getOrderBy(),
        itemPerPage: expenseListQueryRepository.getItemPerPage(),
      });
    });

    it('transition to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(expenseList.state).toEqual({
        type: 'error',
        expenses: [],
        totalItem: 0,
        wallets: [],
        walletId: expenseListQueryRepository.getWalletId(),
        budgets: [],
        budgetId: expenseListQueryRepository.getBudgetId(),
        page: expenseListQueryRepository.getPage(),
        query: expenseListQueryRepository.getSearchQuery(),
        errorMessage: 'Failed to fetch expenses',
        sortBy: expenseListQueryRepository.getSortBy(),
        orderBy: expenseListQueryRepository.getOrderBy(),
        itemPerPage: expenseListQueryRepository.getItemPerPage(),
      });
    });

    it('transition to loading state when FETCH action is dispatched', () => {
      expenseRepository.setShouldFail(false);
      expenseList.dispatch({ type: 'FETCH' });
      expect(expenseList.state).toEqual({
        type: 'loading',
        expenses: [],
        totalItem: 0,
        wallets: [],
        walletId: expenseListQueryRepository.getWalletId(),
        budgets: [],
        budgetId: expenseListQueryRepository.getBudgetId(),
        page: expenseListQueryRepository.getPage(),
        query: expenseListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: expenseListQueryRepository.getSortBy(),
        orderBy: expenseListQueryRepository.getOrderBy(),
        itemPerPage: expenseListQueryRepository.getItemPerPage(),
      });
    });

    it('transition to loaded state after successful fetch', async () => {
      await Promise.resolve();
      expect(expenseList.state).toEqual({
        type: 'loaded',
        expenses: expenseRepository.expenses,
        totalItem: expenseRepository.expenses.length,
        wallets: walletRepository.wallets,
        walletId: expenseListQueryRepository.getWalletId(),
        budgets: budgetRepository.budgets,
        budgetId: expenseListQueryRepository.getBudgetId(),
        page: expenseListQueryRepository.getPage(),
        query: expenseListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: expenseListQueryRepository.getSortBy(),
        orderBy: expenseListQueryRepository.getOrderBy(),
        itemPerPage: expenseListQueryRepository.getItemPerPage(),
      });
    });
  });

  it('should show loaded state when initial data is given', async () => {
    const expenses = [expenseRepository.expenses[0]];
    const usecase = new ExpenseListUsecase(
      expenseRepository,
      expenseListQueryRepository,
      walletRepository,
      budgetRepository,
      { expenses, totalItem: 1, wallets: [], budgets: [] }
    );
    const expenseList = new UsecaseTester<
      ExpenseListUsecase,
      ExpenseListState,
      ExpenseListAction,
      ExpenseListParams
    >(usecase);

    expect(expenseList.state.type).toBe('loaded');
    expect(expenseList.state.expenses).toEqual(expenses);
    expect(expenseList.state.totalItem).toBe(expenses.length);
  });
});
