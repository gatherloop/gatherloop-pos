import {
  ChecklistTemplateUpdateUsecase,
  ChecklistTemplateUpdateState,
  ChecklistTemplateUpdateAction,
  ChecklistTemplateUpdateParams,
} from './checklistTemplateUpdate';
import { MockChecklistTemplateRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

const updatedForm = {
  name: 'Updated Checklist',
  description: 'Updated description',
  items: [
    {
      name: 'New Task',
      description: '',
      displayOrder: 1,
      subItems: [],
    },
  ],
};

describe('ChecklistTemplateUpdateUsecase', () => {
  describe('with pre-loaded template', () => {
    it('should start in loaded state when template is provided', () => {
      const repository = new MockChecklistTemplateRepository();
      const template = repository.checklistTemplates[0];
      const params: ChecklistTemplateUpdateParams = {
        checklistTemplateId: template.id,
        checklistTemplate: template,
      };
      const usecase = new ChecklistTemplateUpdateUsecase(repository, params);
      const tester = new UsecaseTester<
        ChecklistTemplateUpdateUsecase,
        ChecklistTemplateUpdateState,
        ChecklistTemplateUpdateAction,
        ChecklistTemplateUpdateParams
      >(usecase);

      expect(tester.state.type).toBe('loaded');
      expect(tester.state.values.name).toBe(template.name);
    });
  });

  describe('without pre-loaded template', () => {
    it('should auto-fetch and transition to loaded', async () => {
      const repository = new MockChecklistTemplateRepository();
      const params: ChecklistTemplateUpdateParams = {
        checklistTemplateId: 1,
        checklistTemplate: null,
      };
      const usecase = new ChecklistTemplateUpdateUsecase(repository, params);
      const tester = new UsecaseTester<
        ChecklistTemplateUpdateUsecase,
        ChecklistTemplateUpdateState,
        ChecklistTemplateUpdateAction,
        ChecklistTemplateUpdateParams
      >(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
      expect(tester.state.values.name).toBe('Opening Checklist');
    });
  });

  describe('submit success flow', () => {
    it('should transition loaded → submitting → submitSuccess', async () => {
      const repository = new MockChecklistTemplateRepository();
      const template = repository.checklistTemplates[0];
      const params: ChecklistTemplateUpdateParams = {
        checklistTemplateId: template.id,
        checklistTemplate: template,
      };
      const usecase = new ChecklistTemplateUpdateUsecase(repository, params);
      const tester = new UsecaseTester<
        ChecklistTemplateUpdateUsecase,
        ChecklistTemplateUpdateState,
        ChecklistTemplateUpdateAction,
        ChecklistTemplateUpdateParams
      >(usecase);

      tester.dispatch({ type: 'SUBMIT', values: updatedForm });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
      expect(repository.checklistTemplates[0].name).toBe('Updated Checklist');
    });
  });

  describe('submit error flow', () => {
    it('should transition loaded → submitting → loaded (auto-recover)', async () => {
      const repository = new MockChecklistTemplateRepository();
      repository.setShouldFail(true);
      const template = { ...repository.checklistTemplates[0] };
      const params: ChecklistTemplateUpdateParams = {
        checklistTemplateId: template.id,
        checklistTemplate: template,
      };
      const usecase = new ChecklistTemplateUpdateUsecase(repository, params);
      const tester = new UsecaseTester<
        ChecklistTemplateUpdateUsecase,
        ChecklistTemplateUpdateState,
        ChecklistTemplateUpdateAction,
        ChecklistTemplateUpdateParams
      >(usecase);

      tester.dispatch({ type: 'SUBMIT', values: updatedForm });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });
});
