import {
  BudgetListUsecase,
  BudgetListAction,
  BudgetListState,
  BudgetListParams,
} from './budgetList';
import { MockBudgetRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('BudgetListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → revalidating → loaded', async () => {
      const repository = new MockBudgetRepository();
      const usecase = new BudgetListUsecase(repository, { budgets: [] });
      const budgetList = new UsecaseTester<
        BudgetListUsecase,
        BudgetListState,
        BudgetListAction,
        BudgetListParams
      >(usecase);

      expect(budgetList.state).toEqual({
        type: 'loading',
        budgets: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(budgetList.state).toEqual({
        type: 'loaded',
        budgets: repository.budgets,
        errorMessage: null,
      });

      budgetList.dispatch({ type: 'FETCH' });
      expect(budgetList.state).toEqual({
        type: 'revalidating',
        budgets: repository.budgets,
        errorMessage: null,
      });

      await flushPromises();
      expect(budgetList.state).toEqual({
        type: 'loaded',
        budgets: repository.budgets,
        errorMessage: null,
      });
    });
  });

  describe('failed flow', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockBudgetRepository();
      repository.setShouldFail(true);
      const usecase = new BudgetListUsecase(repository, { budgets: [] });
      const budgetList = new UsecaseTester<
        BudgetListUsecase,
        BudgetListState,
        BudgetListAction,
        BudgetListParams
      >(usecase);

      expect(budgetList.state).toEqual({
        type: 'loading',
        budgets: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(budgetList.state).toEqual({
        type: 'error',
        budgets: [],
        errorMessage: 'Failed to fetch budgets',
      });

      repository.setShouldFail(false);
      budgetList.dispatch({ type: 'FETCH' });
      expect(budgetList.state).toEqual({
        type: 'loading',
        budgets: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(budgetList.state).toEqual({
        type: 'loaded',
        budgets: repository.budgets,
        errorMessage: null,
      });
    });
  });

  it('show loaded state when initial data is given', async () => {
    const repository = new MockBudgetRepository();

    const budgets = [
      {
        id: 1,
        name: 'Budget Test 1',
        percentage: 30,
        balance: 500,
        createdAt: new Date().toISOString(),
      },
    ];

    const usecase = new BudgetListUsecase(repository, { budgets });

    const budgetList = new UsecaseTester<
      BudgetListUsecase,
      BudgetListState,
      BudgetListAction,
      BudgetListParams
    >(usecase);

    expect(budgetList.state).toEqual({
      type: 'loaded',
      budgets,
      errorMessage: null,
    });
  });
});
