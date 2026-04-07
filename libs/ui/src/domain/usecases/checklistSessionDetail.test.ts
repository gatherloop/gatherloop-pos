import {
  ChecklistSessionDetailUsecase,
  ChecklistSessionDetailState,
  ChecklistSessionDetailAction,
  ChecklistSessionDetailParams,
} from './checklistSessionDetail';
import { MockChecklistSessionRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('ChecklistSessionDetailUsecase', () => {
  describe('initial state with preloaded session', () => {
    it('should start in loaded state when session is provided', () => {
      const repository = new MockChecklistSessionRepository();
      const params: ChecklistSessionDetailParams = {
        checklistSessionId: 1,
        checklistSession: repository.sessions[0],
      };
      const usecase = new ChecklistSessionDetailUsecase(repository, params);
      const tester = new UsecaseTester<
        ChecklistSessionDetailUsecase,
        ChecklistSessionDetailState,
        ChecklistSessionDetailAction,
        ChecklistSessionDetailParams
      >(usecase);

      expect(tester.state.type).toBe('loaded');
      expect(tester.state.checklistSession?.id).toBe(1);
    });
  });

  describe('initial state without preloaded session', () => {
    it('should start in idle state and auto-fetch', async () => {
      const repository = new MockChecklistSessionRepository();
      const params: ChecklistSessionDetailParams = {
        checklistSessionId: 1,
        checklistSession: null,
      };
      const usecase = new ChecklistSessionDetailUsecase(repository, params);
      const tester = new UsecaseTester<
        ChecklistSessionDetailUsecase,
        ChecklistSessionDetailState,
        ChecklistSessionDetailAction,
        ChecklistSessionDetailParams
      >(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
      expect(tester.state.checklistSession?.id).toBe(1);
    });
  });

  describe('error flow', () => {
    it('should transition to error state on fetch failure', async () => {
      const repository = new MockChecklistSessionRepository();
      repository.setShouldFail(true);
      const params: ChecklistSessionDetailParams = {
        checklistSessionId: 1,
        checklistSession: null,
      };
      const usecase = new ChecklistSessionDetailUsecase(repository, params);
      const tester = new UsecaseTester<
        ChecklistSessionDetailUsecase,
        ChecklistSessionDetailState,
        ChecklistSessionDetailAction,
        ChecklistSessionDetailParams
      >(usecase);

      await flushPromises();
      expect(tester.state.type).toBe('error');
    });

    it('should retry fetch from error state', async () => {
      const repository = new MockChecklistSessionRepository();
      repository.setShouldFail(true);
      const params: ChecklistSessionDetailParams = {
        checklistSessionId: 1,
        checklistSession: null,
      };
      const usecase = new ChecklistSessionDetailUsecase(repository, params);
      const tester = new UsecaseTester<
        ChecklistSessionDetailUsecase,
        ChecklistSessionDetailState,
        ChecklistSessionDetailAction,
        ChecklistSessionDetailParams
      >(usecase);

      await flushPromises();
      expect(tester.state.type).toBe('error');

      repository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });
});
