import {
  ChecklistSessionDeleteUsecase,
  ChecklistSessionDeleteState,
  ChecklistSessionDeleteAction,
} from './checklistSessionDelete';
import { MockChecklistSessionRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('ChecklistSessionDeleteUsecase', () => {
  describe('initial state', () => {
    it('should start in hidden state', () => {
      const repository = new MockChecklistSessionRepository();
      const usecase = new ChecklistSessionDeleteUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistSessionDeleteUsecase,
        ChecklistSessionDeleteState,
        ChecklistSessionDeleteAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('hidden');
      expect(tester.state.checklistSessionId).toBeNull();
    });
  });

  describe('success flow', () => {
    it('should transition hidden → shown → deleting → deletingSuccess → hidden', async () => {
      const repository = new MockChecklistSessionRepository();
      const usecase = new ChecklistSessionDeleteUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistSessionDeleteUsecase,
        ChecklistSessionDeleteState,
        ChecklistSessionDeleteAction,
        undefined
      >(usecase);

      tester.dispatch({ type: 'SHOW_CONFIRMATION', checklistSessionId: 1 });
      expect(tester.state.type).toBe('shown');
      expect(tester.state.checklistSessionId).toBe(1);

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deletingSuccess auto-hides via onStateChange
      expect(tester.state.type).toBe('hidden');
      expect(repository.sessions).toHaveLength(0);
    });
  });

  describe('cancel flow', () => {
    it('should transition hidden → shown → hidden on cancel', () => {
      const repository = new MockChecklistSessionRepository();
      const usecase = new ChecklistSessionDeleteUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistSessionDeleteUsecase,
        ChecklistSessionDeleteState,
        ChecklistSessionDeleteAction,
        undefined
      >(usecase);

      tester.dispatch({ type: 'SHOW_CONFIRMATION', checklistSessionId: 1 });
      expect(tester.state.type).toBe('shown');

      tester.dispatch({ type: 'HIDE_CONFIRMATION' });
      expect(tester.state.type).toBe('hidden');
    });
  });

  describe('error flow', () => {
    it('should transition to deletingError and auto-recover on error', async () => {
      const repository = new MockChecklistSessionRepository();
      repository.setShouldFail(true);
      const usecase = new ChecklistSessionDeleteUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistSessionDeleteUsecase,
        ChecklistSessionDeleteState,
        ChecklistSessionDeleteAction,
        undefined
      >(usecase);

      tester.dispatch({ type: 'SHOW_CONFIRMATION', checklistSessionId: 1 });
      tester.dispatch({ type: 'DELETE' });

      await flushPromises();
      // deletingError auto-cancels to shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
