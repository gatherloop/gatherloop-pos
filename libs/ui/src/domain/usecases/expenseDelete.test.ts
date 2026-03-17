import {
  ExpenseDeleteUsecase,
  ExpenseDeleteState,
  ExpenseDeleteAction,
} from './expenseDelete';
import { MockExpenseRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('ExpenseDeleteUsecase', () => {
  describe('success flow', () => {
    it('should transition hidden → shown → deleting → hidden', async () => {
      const repository = new MockExpenseRepository();
      const usecase = new ExpenseDeleteUsecase(repository);
      const tester = new UsecaseTester<ExpenseDeleteUsecase, ExpenseDeleteState, ExpenseDeleteAction, undefined>(usecase);

      expect(tester.state).toEqual({ type: 'hidden', expenseId: null });

      tester.dispatch({ type: 'SHOW_CONFIRMATION', expenseId: 1 });
      expect(tester.state).toEqual({ type: 'shown', expenseId: 1 });

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deletingSuccess -> onStateChange dispatches HIDE_CONFIRMATION -> hidden
      expect(tester.state.type).toBe('hidden');
    });
  });

  it('transitions to hidden when HIDE_CONFIRMATION is dispatched from shown', () => {
    const repository = new MockExpenseRepository();
    const usecase = new ExpenseDeleteUsecase(repository);
    const tester = new UsecaseTester<ExpenseDeleteUsecase, ExpenseDeleteState, ExpenseDeleteAction, undefined>(usecase);
    tester.dispatch({ type: 'SHOW_CONFIRMATION', expenseId: 1 });
    tester.dispatch({ type: 'HIDE_CONFIRMATION' });
    expect(tester.state.type).toBe('hidden');
  });

  describe('error flow', () => {
    it('should transition hidden → shown → deleting → shown (auto-recovery)', async () => {
      const repository = new MockExpenseRepository();
      repository.setShouldFail(true);
      const usecase = new ExpenseDeleteUsecase(repository);
      const tester = new UsecaseTester<ExpenseDeleteUsecase, ExpenseDeleteState, ExpenseDeleteAction, undefined>(usecase);

      expect(tester.state.type).toBe('hidden');

      tester.dispatch({ type: 'SHOW_CONFIRMATION', expenseId: 1 });
      expect(tester.state.type).toBe('shown');

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deleting -> deletingError -> onStateChange(deletingError) -> DELETE_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
