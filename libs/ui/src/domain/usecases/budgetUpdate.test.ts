import {
  BudgetUpdateUsecase,
  BudgetUpdateState,
  BudgetUpdateAction,
  BudgetUpdateParams,
} from './budgetUpdate';
import { MockBudgetRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('BudgetUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    it('should transition loading -> loaded -> submitting -> submitSuccess', async () => {
      const repository = new MockBudgetRepository();
      const usecase = new BudgetUpdateUsecase(repository, { budgetId: 1, budget: null });
      const tester = new UsecaseTester<BudgetUpdateUsecase, BudgetUpdateState, BudgetUpdateAction, BudgetUpdateParams>(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Updated Budget', percentage: 40 },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading -> error -> loading -> loaded', async () => {
      const repository = new MockBudgetRepository();
      repository.setShouldFail(true);
      const usecase = new BudgetUpdateUsecase(repository, { budgetId: 1, budget: null });
      const tester = new UsecaseTester<BudgetUpdateUsecase, BudgetUpdateState, BudgetUpdateAction, BudgetUpdateParams>(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('error');

      repository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - submit error', () => {
    it('should transition loaded -> submitting -> submitError', async () => {
      const repository = new MockBudgetRepository();
      repository.setShouldFail(true);
      const usecase = new BudgetUpdateUsecase(repository, {
        budgetId: 1,
        budget: repository.budgets[0],
      });
      const tester = new UsecaseTester<BudgetUpdateUsecase, BudgetUpdateState, BudgetUpdateAction, BudgetUpdateParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'Updated Budget', percentage: 40 },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitError');
    });
  });

  it('starts in loaded state when data is preloaded', () => {
    const repository = new MockBudgetRepository();
    const existing = repository.budgets[0];
    const usecase = new BudgetUpdateUsecase(repository, { budgetId: 1, budget: existing });
    const tester = new UsecaseTester<BudgetUpdateUsecase, BudgetUpdateState, BudgetUpdateAction, BudgetUpdateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
