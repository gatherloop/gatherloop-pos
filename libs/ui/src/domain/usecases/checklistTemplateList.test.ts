import {
  ChecklistTemplateListUsecase,
  ChecklistTemplateListState,
  ChecklistTemplateListAction,
  ChecklistTemplateListParams,
} from './checklistTemplateList';
import { MockChecklistTemplateRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('ChecklistTemplateListUsecase', () => {
  describe('initial state with no pre-loaded data', () => {
    it('should start in idle state and auto-fetch', async () => {
      const repository = new MockChecklistTemplateRepository();
      const params: ChecklistTemplateListParams = {
        checklistTemplates: [],
        totalItem: 0,
      };
      const usecase = new ChecklistTemplateListUsecase(repository, params);
      const tester = new UsecaseTester<
        ChecklistTemplateListUsecase,
        ChecklistTemplateListState,
        ChecklistTemplateListAction,
        ChecklistTemplateListParams
      >(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
      expect(tester.state.checklistTemplates).toHaveLength(2);
    });
  });

  describe('initial state with pre-loaded data', () => {
    it('should start in loaded state when data provided', () => {
      const repository = new MockChecklistTemplateRepository();
      const { checklistTemplates } = repository.getChecklistTemplateList({
        page: 1,
        itemPerPage: 10,
        query: '',
        sortBy: 'created_at',
        orderBy: 'asc',
      });
      const params: ChecklistTemplateListParams = {
        checklistTemplates,
        totalItem: checklistTemplates.length,
      };
      const usecase = new ChecklistTemplateListUsecase(repository, params);
      const tester = new UsecaseTester<
        ChecklistTemplateListUsecase,
        ChecklistTemplateListState,
        ChecklistTemplateListAction,
        ChecklistTemplateListParams
      >(usecase);

      expect(tester.state.type).toBe('loaded');
      expect(tester.state.checklistTemplates).toHaveLength(2);
    });
  });

  describe('error flow', () => {
    it('should transition to error state on fetch failure', async () => {
      const repository = new MockChecklistTemplateRepository();
      repository.setShouldFail(true);
      const params: ChecklistTemplateListParams = {
        checklistTemplates: [],
        totalItem: 0,
      };
      const usecase = new ChecklistTemplateListUsecase(repository, params);
      const tester = new UsecaseTester<
        ChecklistTemplateListUsecase,
        ChecklistTemplateListState,
        ChecklistTemplateListAction,
        ChecklistTemplateListParams
      >(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('error');
      expect(tester.state.errorMessage).toBeTruthy();
    });
  });
});
