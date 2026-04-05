import {
  ChecklistSessionSubItemToggleUsecase,
  ChecklistSessionSubItemToggleState,
  ChecklistSessionSubItemToggleAction,
} from './checklistSessionSubItemToggle';
import { MockChecklistSessionRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('ChecklistSessionSubItemToggleUsecase', () => {
  describe('initial state', () => {
    it('should start in idle state', () => {
      const repository = new MockChecklistSessionRepository();
      const usecase = new ChecklistSessionSubItemToggleUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistSessionSubItemToggleUsecase,
        ChecklistSessionSubItemToggleState,
        ChecklistSessionSubItemToggleAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('idle');
      expect(tester.state.subItemId).toBeNull();
    });
  });

  describe('check sub-item flow', () => {
    it('should transition idle → checking → toggleSuccess → idle', async () => {
      const repository = new MockChecklistSessionRepository();
      const usecase = new ChecklistSessionSubItemToggleUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistSessionSubItemToggleUsecase,
        ChecklistSessionSubItemToggleState,
        ChecklistSessionSubItemToggleAction,
        undefined
      >(usecase);

      // Sub-item 1 (Bar Lamp) is unchecked
      tester.dispatch({ type: 'CHECK', subItemId: 1 });
      expect(tester.state.type).toBe('checking');
      expect(tester.state.subItemId).toBe(1);

      await flushPromises();
      // toggleSuccess auto-resets to idle
      expect(tester.state.type).toBe('idle');

      const session = repository.sessions[0];
      const subItem = session.items[0].subItems.find((s) => s.id === 1);
      expect(subItem?.completedAt).toBeDefined();
    });
  });

  describe('uncheck sub-item flow', () => {
    it('should transition idle → unchecking → toggleSuccess → idle', async () => {
      const repository = new MockChecklistSessionRepository();
      // Pre-check sub-item 1
      repository.sessions[0].items[0].subItems[0].completedAt =
        '2024-03-20T10:00:00.000Z';

      const usecase = new ChecklistSessionSubItemToggleUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistSessionSubItemToggleUsecase,
        ChecklistSessionSubItemToggleState,
        ChecklistSessionSubItemToggleAction,
        undefined
      >(usecase);

      tester.dispatch({ type: 'UNCHECK', subItemId: 1 });
      expect(tester.state.type).toBe('unchecking');

      await flushPromises();
      expect(tester.state.type).toBe('idle');

      const session = repository.sessions[0];
      const subItem = session.items[0].subItems.find((s) => s.id === 1);
      expect(subItem?.completedAt).toBeUndefined();
    });
  });

  describe('error flow', () => {
    it('should auto-reset to idle on error', async () => {
      const repository = new MockChecklistSessionRepository();
      repository.setShouldFail(true);
      const usecase = new ChecklistSessionSubItemToggleUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistSessionSubItemToggleUsecase,
        ChecklistSessionSubItemToggleState,
        ChecklistSessionSubItemToggleAction,
        undefined
      >(usecase);

      tester.dispatch({ type: 'CHECK', subItemId: 1 });
      await flushPromises();
      expect(tester.state.type).toBe('idle');
    });
  });

  describe('cascading completion', () => {
    it('should auto-complete parent item when all sub-items are checked', async () => {
      const repository = new MockChecklistSessionRepository();
      // Pre-check sub-item 2 (Door Lamp)
      repository.sessions[0].items[0].subItems[1].completedAt =
        '2024-03-20T10:00:00.000Z';

      const usecase = new ChecklistSessionSubItemToggleUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistSessionSubItemToggleUsecase,
        ChecklistSessionSubItemToggleState,
        ChecklistSessionSubItemToggleAction,
        undefined
      >(usecase);

      // Check sub-item 1 (Bar Lamp) - all sub-items will be checked
      tester.dispatch({ type: 'CHECK', subItemId: 1 });
      await flushPromises();

      const item = repository.sessions[0].items[0];
      expect(item.completedAt).toBeDefined();
    });
  });
});
