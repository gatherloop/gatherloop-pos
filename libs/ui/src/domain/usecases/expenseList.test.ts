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
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('ExpenseListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → revalidating → loaded → changingParams', async () => {
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

      const expenseList = new UsecaseTester<
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

      await flushPromises();
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

      await flushPromises();
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
    it('should transition loading → error → loading → loaded', async () => {
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

      const expenseList = new UsecaseTester<
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

      await flushPromises();
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

      await flushPromises();
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
    const expenseRepository = new MockExpenseRepository();
    const expenseListQueryRepository = new MockExpenseListQueryRepository();
    const walletRepository = new MockWalletRepository();
    const budgetRepository = new MockBudgetRepository();
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
