import {
  ExpenseUpdateUsecase,
  ExpenseUpdateState,
  ExpenseUpdateAction,
  ExpenseUpdateParams,
} from './expenseUpdate';
import { MockExpenseRepository, MockWalletRepository, MockBudgetRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('ExpenseUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    it('should transition loading → loaded → submitting → submitSuccess', async () => {
      const expenseRepository = new MockExpenseRepository();
      const budgetRepository = new MockBudgetRepository();
      const walletRepository = new MockWalletRepository();
      const usecase = new ExpenseUpdateUsecase(expenseRepository, budgetRepository, walletRepository, {
        expenseId: 1,
        expense: null,
        budgets: [],
        wallets: [],
      });
      const tester = new UsecaseTester<ExpenseUpdateUsecase, ExpenseUpdateState, ExpenseUpdateAction, ExpenseUpdateParams>(usecase);

      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { budgetId: 1, walletId: 1, expenseItems: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const expenseRepository = new MockExpenseRepository();
      expenseRepository.setShouldFail(true);
      const budgetRepository = new MockBudgetRepository();
      const walletRepository = new MockWalletRepository();
      const usecase = new ExpenseUpdateUsecase(expenseRepository, budgetRepository, walletRepository, {
        expenseId: 1,
        expense: null,
        budgets: [],
        wallets: [],
      });
      const tester = new UsecaseTester<ExpenseUpdateUsecase, ExpenseUpdateState, ExpenseUpdateAction, ExpenseUpdateParams>(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('error');

      expenseRepository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - submit error', () => {
    it('should transition loaded → submitting → submitError', async () => {
      const expenseRepository = new MockExpenseRepository();
      expenseRepository.setShouldFail(true);
      const budgetRepository = new MockBudgetRepository();
      const walletRepository = new MockWalletRepository();
      const usecase = new ExpenseUpdateUsecase(expenseRepository, budgetRepository, walletRepository, {
        expenseId: 1,
        expense: expenseRepository.expenses[0],
        budgets: budgetRepository.budgets,
        wallets: walletRepository.wallets,
      });
      const tester = new UsecaseTester<ExpenseUpdateUsecase, ExpenseUpdateState, ExpenseUpdateAction, ExpenseUpdateParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { budgetId: 1, walletId: 1, expenseItems: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('submitError');
    });
  });

  it('starts in loaded state when data is preloaded', () => {
    const expenseRepository = new MockExpenseRepository();
    const budgetRepository = new MockBudgetRepository();
    const walletRepository = new MockWalletRepository();
    const existing = expenseRepository.expenses[0];
    const usecase = new ExpenseUpdateUsecase(expenseRepository, budgetRepository, walletRepository, {
      expenseId: 1,
      expense: existing,
      budgets: budgetRepository.budgets,
      wallets: walletRepository.wallets,
    });
    const tester = new UsecaseTester<ExpenseUpdateUsecase, ExpenseUpdateState, ExpenseUpdateAction, ExpenseUpdateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
