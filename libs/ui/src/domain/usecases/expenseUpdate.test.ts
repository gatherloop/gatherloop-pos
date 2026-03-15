import {
  ExpenseUpdateUsecase,
  ExpenseUpdateState,
  ExpenseUpdateAction,
  ExpenseUpdateParams,
} from './expenseUpdate';
import { MockExpenseRepository, MockWalletRepository, MockBudgetRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('ExpenseUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    const expenseRepository = new MockExpenseRepository();
    const budgetRepository = new MockBudgetRepository();
    const walletRepository = new MockWalletRepository();
    const usecase = new ExpenseUpdateUsecase(expenseRepository, budgetRepository, walletRepository, {
      expenseId: 1,
      expense: null,
      budgets: [],
      wallets: [],
    });
    let tester: UsecaseTester<ExpenseUpdateUsecase, ExpenseUpdateState, ExpenseUpdateAction, ExpenseUpdateParams>;

    it('initializes in loading state when no data preloaded', () => {
      tester = new UsecaseTester(usecase);
      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { budgetId: 1, walletId: 1, expenseItems: [] },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful submit', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
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
    let tester: UsecaseTester<ExpenseUpdateUsecase, ExpenseUpdateState, ExpenseUpdateAction, ExpenseUpdateParams>;

    it('initializes in loading state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('error');
    });

    it('transitions to loading when FETCH is dispatched from error', () => {
      expenseRepository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - submit error', () => {
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
    let tester: UsecaseTester<ExpenseUpdateUsecase, ExpenseUpdateState, ExpenseUpdateAction, ExpenseUpdateParams>;

    it('initializes in loaded state when data is preloaded', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { budgetId: 1, walletId: 1, expenseItems: [] },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
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
