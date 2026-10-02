import { TagCreateUsecase, TagCreateState, TagCreateAction } from './tagCreate';
import { MockTagRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TagCreateUsecase', () => {
  describe('success flow', () => {
    it('should transition loaded → submitting → submitSuccess', async () => {
      const repository = new MockTagRepository();
      const usecase = new TagCreateUsecase(repository);
      const tester = new UsecaseTester<
        TagCreateUsecase,
        TagCreateState,
        TagCreateAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: {
          name: 'New Tag',
          color: 'green',
          isHighlighted: false,
          sortOrder: 0,
        },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    it('should transition loaded → submitting → submitError', async () => {
      const repository = new MockTagRepository();
      repository.setShouldFail(true);
      const usecase = new TagCreateUsecase(repository);
      const tester = new UsecaseTester<
        TagCreateUsecase,
        TagCreateState,
        TagCreateAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: {
          name: 'New Tag',
          color: 'green',
          isHighlighted: false,
          sortOrder: 0,
        },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitError');
    });
  });
});
