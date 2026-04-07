import {
  ChecklistSessionListUsecase,
  ChecklistSessionListState,
  ChecklistSessionListAction,
  ChecklistSessionListParams,
} from './checklistSessionList';
import { MockChecklistSessionRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('ChecklistSessionListUsecase', () => {
  describe('initial state with no pre-loaded data', () => {
    it('should start in idle state and auto-fetch', async () => {
      const repository = new MockChecklistSessionRepository();
      const params: ChecklistSessionListParams = {
        checklistSessions: [],
        totalItem: 0,
      };
      const usecase = new ChecklistSessionListUsecase(repository, params);
      const tester = new UsecaseTester<
        ChecklistSessionListUsecase,
        ChecklistSessionListState,
        ChecklistSessionListAction,
        ChecklistSessionListParams
      >(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
      expect(tester.state.checklistSessions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('initial state with pre-loaded data', () => {
    it('should start in loaded state when data provided', () => {
      const repository = new MockChecklistSessionRepository();
      const { checklistSessions } = repository.getChecklistSessionList({
        page: 1,
        itemPerPage: 10,
        filter: {},
      });
      const params: ChecklistSessionListParams = {
        checklistSessions,
        totalItem: checklistSessions.length,
      };
      const usecase = new ChecklistSessionListUsecase(repository, params);
      const tester = new UsecaseTester<
        ChecklistSessionListUsecase,
        ChecklistSessionListState,
        ChecklistSessionListAction,
        ChecklistSessionListParams
      >(usecase);

      expect(tester.state.type).toBe('loaded');
      expect(tester.state.checklistSessions).toHaveLength(
        checklistSessions.length
      );
    });
  });

  describe('error flow', () => {
    it('should transition to error state on fetch failure', async () => {
      const repository = new MockChecklistSessionRepository();
      repository.setShouldFail(true);
      const params: ChecklistSessionListParams = {
        checklistSessions: [],
        totalItem: 0,
      };
      const usecase = new ChecklistSessionListUsecase(repository, params);
      const tester = new UsecaseTester<
        ChecklistSessionListUsecase,
        ChecklistSessionListState,
        ChecklistSessionListAction,
        ChecklistSessionListParams
      >(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('error');
      expect(tester.state.errorMessage).toBeTruthy();
    });
  });

  describe('filter changes', () => {
    it('should transition to changingParams when filter changes', async () => {
      const repository = new MockChecklistSessionRepository();
      const params: ChecklistSessionListParams = {
        checklistSessions: [],
        totalItem: 0,
      };
      const usecase = new ChecklistSessionListUsecase(repository, params);
      const tester = new UsecaseTester<
        ChecklistSessionListUsecase,
        ChecklistSessionListState,
        ChecklistSessionListAction,
        ChecklistSessionListParams
      >(usecase);

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'CHANGE_PARAMS',
        filter: { status: 'completed' },
      });

      expect(tester.state.type).toBe('changingParams');
      expect(tester.state.filter.status).toBe('completed');
    });

    it('should fetch with template id filter', async () => {
      const repository = new MockChecklistSessionRepository();
      const params: ChecklistSessionListParams = {
        checklistSessions: [],
        totalItem: 0,
      };
      const usecase = new ChecklistSessionListUsecase(repository, params);
      const tester = new UsecaseTester<
        ChecklistSessionListUsecase,
        ChecklistSessionListState,
        ChecklistSessionListAction,
        ChecklistSessionListParams
      >(usecase);

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'CHANGE_PARAMS',
        filter: { templateId: 1 },
      });

      await flushPromises();
      expect(tester.state.filter.templateId).toBe(1);
    });
  });
});
