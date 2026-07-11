import {
  BudgetCreateUsecase,
  BudgetCreateState,
  BudgetCreateAction,
} from './budgetCreate';
import { MockBudgetRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('BudgetCreateUsecase', () => {
  describe('success flow', () => {
    it('should transition loaded -> submitting -> submitSuccess', async () => {
      const repository = new MockBudgetRepository();
      const usecase = new BudgetCreateUsecase(repository);
      const tester = new UsecaseTester<BudgetCreateUsecase, BudgetCreateState, BudgetCreateAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'New Budget', percentage: 30 },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    it('should transition loaded -> submitting -> submitError', async () => {
      const repository = new MockBudgetRepository();
      repository.setShouldFail(true);
      const usecase = new BudgetCreateUsecase(repository);
      const tester = new UsecaseTester<BudgetCreateUsecase, BudgetCreateState, BudgetCreateAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { name: 'New Budget', percentage: 30 },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitError');
    });
  });
});
