import {
  ChecklistTemplateCreateUsecase,
  ChecklistTemplateCreateState,
  ChecklistTemplateCreateAction,
} from './checklistTemplateCreate';
import { MockChecklistTemplateRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

const validForm = {
  name: 'Opening Checklist',
  description: 'Morning opening tasks',
  items: [
    {
      name: 'Turn on lights',
      description: '',
      displayOrder: 1,
      subItems: [],
    },
  ],
};

describe('ChecklistTemplateCreateUsecase', () => {
  describe('initial state', () => {
    it('should start in loaded state with empty values', () => {
      const repository = new MockChecklistTemplateRepository();
      const usecase = new ChecklistTemplateCreateUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistTemplateCreateUsecase,
        ChecklistTemplateCreateState,
        ChecklistTemplateCreateAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('loaded');
      expect(tester.state.values.name).toBe('');
      expect(tester.state.values.items).toHaveLength(0);
    });
  });

  describe('success flow', () => {
    it('should transition loaded → submitting → submitSuccess', async () => {
      const repository = new MockChecklistTemplateRepository();
      const usecase = new ChecklistTemplateCreateUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistTemplateCreateUsecase,
        ChecklistTemplateCreateState,
        ChecklistTemplateCreateAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: validForm });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
      expect(repository.checklistTemplates).toHaveLength(3);
    });
  });

  describe('error flow', () => {
    it('should transition loaded → submitting → submitError', async () => {
      const repository = new MockChecklistTemplateRepository();
      repository.setShouldFail(true);
      const usecase = new ChecklistTemplateCreateUsecase(repository);
      const tester = new UsecaseTester<
        ChecklistTemplateCreateUsecase,
        ChecklistTemplateCreateState,
        ChecklistTemplateCreateAction,
        undefined
      >(usecase);

      tester.dispatch({ type: 'SUBMIT', values: validForm });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitError');
    });
  });
});
