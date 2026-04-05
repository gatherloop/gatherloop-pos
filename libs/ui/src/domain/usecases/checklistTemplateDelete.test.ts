import {
  ChecklistTemplateDeleteUsecase,
  ChecklistTemplateDeleteState,
  ChecklistTemplateDeleteAction,
} from './checklistTemplateDelete';
import { MockChecklistTemplateRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('ChecklistTemplateDeleteUsecase', () => {
  describe('initial state', () => {
    it('should start in hidden state', () => {
      const repository = new MockChecklistTemplateRepository();
      const usecase = new ChecklistTemplateDeleteUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistTemplateDeleteUsecase,
        ChecklistTemplateDeleteState,
        ChecklistTemplateDeleteAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('hidden');
      expect(tester.state.checklistTemplateId).toBeNull();
    });
  });

  describe('show/hide confirmation', () => {
    it('should transition hidden → shown → hidden', () => {
      const repository = new MockChecklistTemplateRepository();
      const usecase = new ChecklistTemplateDeleteUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistTemplateDeleteUsecase,
        ChecklistTemplateDeleteState,
        ChecklistTemplateDeleteAction,
        undefined
      >(usecase);

      tester.dispatch({ type: 'SHOW_CONFIRMATION', checklistTemplateId: 1 });
      expect(tester.state.type).toBe('shown');
      expect(tester.state.checklistTemplateId).toBe(1);

      tester.dispatch({ type: 'HIDE_CONFIRMATION' });
      expect(tester.state.type).toBe('hidden');
      expect(tester.state.checklistTemplateId).toBeNull();
    });
  });

  describe('delete success flow', () => {
    it('should transition shown → deleting → hidden', async () => {
      const repository = new MockChecklistTemplateRepository();
      const usecase = new ChecklistTemplateDeleteUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistTemplateDeleteUsecase,
        ChecklistTemplateDeleteState,
        ChecklistTemplateDeleteAction,
        undefined
      >(usecase);

      tester.dispatch({ type: 'SHOW_CONFIRMATION', checklistTemplateId: 1 });
      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deletingSuccess auto-hides via onStateChange
      expect(tester.state.type).toBe('hidden');
      expect(repository.checklistTemplates).toHaveLength(1);
    });
  });

  describe('delete error flow', () => {
    it('should transition shown → deleting → shown (auto-recover on error)', async () => {
      const repository = new MockChecklistTemplateRepository();
      repository.setShouldFail(true);
      const usecase = new ChecklistTemplateDeleteUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistTemplateDeleteUsecase,
        ChecklistTemplateDeleteState,
        ChecklistTemplateDeleteAction,
        undefined
      >(usecase);

      tester.dispatch({ type: 'SHOW_CONFIRMATION', checklistTemplateId: 1 });
      tester.dispatch({ type: 'DELETE' });

      await flushPromises();
      // deletingError auto-cancels back to shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
