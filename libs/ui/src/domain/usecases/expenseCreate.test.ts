import {
  ExpenseCreateUsecase,
  ExpenseCreateState,
  ExpenseCreateAction,
  ExpenseCreateParams,
} from './expenseCreate';
import { MockExpenseRepository, MockWalletRepository, MockBudgetRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('ExpenseCreateUsecase', () => {
  describe('success flow - no preloaded data (fetch required)', () => {
    it('should transition loading → loaded → submitting → submitSuccess', async () => {
      const expenseRepository = new MockExpenseRepository();
      const budgetRepository = new MockBudgetRepository();
      const walletRepository = new MockWalletRepository();
      const usecase = new ExpenseCreateUsecase(expenseRepository, budgetRepository, walletRepository, {
        budgets: [],
        wallets: [],
      });
      const tester = new UsecaseTester<ExpenseCreateUsecase, ExpenseCreateState, ExpenseCreateAction, ExpenseCreateParams>(usecase);

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
      const budgetRepository = new MockBudgetRepository();
      budgetRepository.setShouldFail(true);
      const walletRepository = new MockWalletRepository();
      const usecase = new ExpenseCreateUsecase(expenseRepository, budgetRepository, walletRepository, {
        budgets: [],
        wallets: [],
      });
      const tester = new UsecaseTester<ExpenseCreateUsecase, ExpenseCreateState, ExpenseCreateAction, ExpenseCreateParams>(usecase);

      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('error');

      budgetRepository.setShouldFail(false);
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
      const usecase = new ExpenseCreateUsecase(expenseRepository, budgetRepository, walletRepository, {
        budgets: budgetRepository.budgets,
        wallets: walletRepository.wallets,
      });
      const tester = new UsecaseTester<ExpenseCreateUsecase, ExpenseCreateState, ExpenseCreateAction, ExpenseCreateParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { budgetId: 1, walletId: 1, expenseItems: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitError');
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
