import {
  ExpenseCreateUsecase,
  ExpenseCreateState,
  ExpenseCreateAction,
  ExpenseCreateParams,
} from './expenseCreate';
import { MockExpenseRepository, MockWalletRepository, MockBudgetRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('ExpenseCreateUsecase', () => {
  describe('success flow - no preloaded data (fetch required)', () => {
    const expenseRepository = new MockExpenseRepository();
    const budgetRepository = new MockBudgetRepository();
    const walletRepository = new MockWalletRepository();
    const usecase = new ExpenseCreateUsecase(expenseRepository, budgetRepository, walletRepository, {
      budgets: [],
      wallets: [],
    });
    let tester: UsecaseTester<ExpenseCreateUsecase, ExpenseCreateState, ExpenseCreateAction, ExpenseCreateParams>;

    it('initializes in idle state when no data preloaded', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('idle');
    });

    it('transitions to loading when FETCH is dispatched', () => {
      tester.dispatch({ type: 'FETCH' });
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
    const budgetRepository = new MockBudgetRepository();
    budgetRepository.setShouldFail(true);
    const walletRepository = new MockWalletRepository();
    const usecase = new ExpenseCreateUsecase(expenseRepository, budgetRepository, walletRepository, {
      budgets: [],
      wallets: [],
    });
    let tester: UsecaseTester<ExpenseCreateUsecase, ExpenseCreateState, ExpenseCreateAction, ExpenseCreateParams>;

    it('initializes in idle state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('idle');
    });

    it('transitions to loading when FETCH is dispatched', () => {
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('error');
    });

    it('transitions to loading when FETCH is dispatched from error', () => {
      budgetRepository.setShouldFail(false);
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
    const usecase = new ExpenseCreateUsecase(expenseRepository, budgetRepository, walletRepository, {
      budgets: budgetRepository.budgets,
      wallets: walletRepository.wallets,
    });
    let tester: UsecaseTester<ExpenseCreateUsecase, ExpenseCreateState, ExpenseCreateAction, ExpenseCreateParams>;

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
    const usecase = new ExpenseCreateUsecase(expenseRepository, budgetRepository, walletRepository, {
      budgets: budgetRepository.budgets,
      wallets: walletRepository.wallets,
    });
    const tester = new UsecaseTester<ExpenseCreateUsecase, ExpenseCreateState, ExpenseCreateAction, ExpenseCreateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
