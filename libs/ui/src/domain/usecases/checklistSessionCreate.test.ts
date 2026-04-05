import {
  ChecklistSessionCreateUsecase,
  ChecklistSessionCreateState,
  ChecklistSessionCreateAction,
} from './checklistSessionCreate';
import { MockChecklistSessionRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

const today = new Date().toISOString().split('T')[0];

describe('ChecklistSessionCreateUsecase', () => {
  describe('initial state', () => {
    it('should start in loaded state with default values', () => {
      const repository = new MockChecklistSessionRepository();
      const usecase = new ChecklistSessionCreateUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistSessionCreateUsecase,
        ChecklistSessionCreateState,
        ChecklistSessionCreateAction,
        { checklistTemplateId?: number; date?: string }
      >(usecase);

      expect(tester.state.type).toBe('loaded');
      expect(tester.state.values.date).toBe(today);
      expect(tester.state.values.checklistTemplateId).toBe(0);
    });

    it('should use provided params for initial values', () => {
      const repository = new MockChecklistSessionRepository();
      const usecase = new ChecklistSessionCreateUsecase(repository, {
        checklistTemplateId: 5,
        date: '2024-03-20',
      });
      const tester = new UsecaseTester<
        ChecklistSessionCreateUsecase,
        ChecklistSessionCreateState,
        ChecklistSessionCreateAction,
        { checklistTemplateId?: number; date?: string }
      >(usecase);

      expect(tester.state.values.checklistTemplateId).toBe(5);
      expect(tester.state.values.date).toBe('2024-03-20');
    });
  });

  describe('success flow', () => {
    it('should transition loaded → submitting → submitSuccess', async () => {
      const repository = new MockChecklistSessionRepository();
      const usecase = new ChecklistSessionCreateUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistSessionCreateUsecase,
        ChecklistSessionCreateState,
        ChecklistSessionCreateAction,
        { checklistTemplateId?: number; date?: string }
      >(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { checklistTemplateId: 1, date: '2024-03-25' },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
      expect(repository.sessions).toHaveLength(2);
    });
  });

  describe('error flow', () => {
    it('should transition loaded → submitting → loaded (auto-recover on error)', async () => {
      const repository = new MockChecklistSessionRepository();
      repository.setShouldFail(true);
      const usecase = new ChecklistSessionCreateUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistSessionCreateUsecase,
        ChecklistSessionCreateState,
        ChecklistSessionCreateAction,
        { checklistTemplateId?: number; date?: string }
      >(usecase);

      tester.dispatch({
        type: 'SUBMIT',
        values: { checklistTemplateId: 1, date: '2024-03-25' },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded
      expect(tester.state.type).toBe('loaded');
    });
  });
});
