import {
  ChecklistSessionItemToggleUsecase,
  ChecklistSessionItemToggleState,
  ChecklistSessionItemToggleAction,
} from './checklistSessionItemToggle';
import { MockChecklistSessionRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('ChecklistSessionItemToggleUsecase', () => {
  describe('initial state', () => {
    it('should start in idle state', () => {
      const repository = new MockChecklistSessionRepository();
      const usecase = new ChecklistSessionItemToggleUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistSessionItemToggleUsecase,
        ChecklistSessionItemToggleState,
        ChecklistSessionItemToggleAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('idle');
      expect(tester.state.itemId).toBeNull();
    });
  });

  describe('check item flow', () => {
    it('should transition idle → checking → toggleSuccess → idle', async () => {
      const repository = new MockChecklistSessionRepository();
      const usecase = new ChecklistSessionItemToggleUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistSessionItemToggleUsecase,
        ChecklistSessionItemToggleState,
        ChecklistSessionItemToggleAction,
        undefined
      >(usecase);

      // Item 2 has no sub-items
      tester.dispatch({ type: 'CHECK', itemId: 2 });
      expect(tester.state.type).toBe('checking');
      expect(tester.state.itemId).toBe(2);

      await flushPromises();
      // toggleSuccess auto-resets to idle
      expect(tester.state.type).toBe('idle');

      // Verify item was checked
      const session = repository.sessions[0];
      const item = session.items.find((i) => i.id === 2);
      expect(item?.completedAt).toBeDefined();
    });
  });

  describe('uncheck item flow', () => {
    it('should transition idle → unchecking → toggleSuccess → idle', async () => {
      const repository = new MockChecklistSessionRepository();
      // Pre-check item 2
      repository.sessions[0].items[1].completedAt = '2024-03-20T10:00:00.000Z';

      const usecase = new ChecklistSessionItemToggleUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistSessionItemToggleUsecase,
        ChecklistSessionItemToggleState,
        ChecklistSessionItemToggleAction,
        undefined
      >(usecase);

      tester.dispatch({ type: 'UNCHECK', itemId: 2 });
      expect(tester.state.type).toBe('unchecking');

      await flushPromises();
      expect(tester.state.type).toBe('idle');

      const session = repository.sessions[0];
      const item = session.items.find((i) => i.id === 2);
      expect(item?.completedAt).toBeUndefined();
    });
  });

  describe('error flow', () => {
    it('should transition to toggleError and auto-reset on error', async () => {
      const repository = new MockChecklistSessionRepository();
      repository.setShouldFail(true);
      const usecase = new ChecklistSessionItemToggleUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistSessionItemToggleUsecase,
        ChecklistSessionItemToggleState,
        ChecklistSessionItemToggleAction,
        undefined
      >(usecase);

      tester.dispatch({ type: 'CHECK', itemId: 2 });
      await flushPromises();
      // toggleError auto-resets to idle
      expect(tester.state.type).toBe('idle');
    });
  });

  describe('auto session completion', () => {
    it('should mark session as completed when all items are checked', async () => {
      const repository = new MockChecklistSessionRepository();
      // Pre-check sub-items of item 1 to mark it complete
      repository.sessions[0].items[0].subItems[0].completedAt =
        '2024-03-20T10:00:00.000Z';
      repository.sessions[0].items[0].subItems[1].completedAt =
        '2024-03-20T10:00:00.000Z';
      repository.sessions[0].items[0].completedAt = '2024-03-20T10:00:00.000Z';

      const usecase = new ChecklistSessionItemToggleUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistSessionItemToggleUsecase,
        ChecklistSessionItemToggleState,
        ChecklistSessionItemToggleAction,
        undefined
      >(usecase);

      // Check item 2 (the last unchecked item)
      tester.dispatch({ type: 'CHECK', itemId: 2 });
      await flushPromises();

      expect(repository.sessions[0].completedAt).toBeDefined();
    });
  });
});
