import {
  TagUpdateUsecase,
  TagUpdateState,
  TagUpdateAction,
  TagUpdateParams,
} from './tagUpdate';
import { MockTagRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TagUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    it('should transition loading → loaded → submitting → submitSuccess', async () => {
      const repository = new MockTagRepository();
      const usecase = new TagUpdateUsecase(repository, { tagId: 1, tag: null });
      const tester = new UsecaseTester<
        TagUpdateUsecase,
        TagUpdateState,
        TagUpdateAction,
        TagUpdateParams
      >(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: {
          name: 'Updated Tag',
          color: 'blue',
          isHighlighted: true,
          sortOrder: 5,
        },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockTagRepository();
      repository.setShouldFail(true);
      const usecase = new TagUpdateUsecase(repository, { tagId: 1, tag: null });
      const tester = new UsecaseTester<
        TagUpdateUsecase,
        TagUpdateState,
        TagUpdateAction,
        TagUpdateParams
      >(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('error');

      repository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - submit error', () => {
    it('should transition loaded → submitting → submitError', async () => {
      const repository = new MockTagRepository();
      repository.setShouldFail(true);
      const usecase = new TagUpdateUsecase(repository, {
        tagId: 1,
        tag: repository.tags[0],
      });
      const tester = new UsecaseTester<
        TagUpdateUsecase,
        TagUpdateState,
        TagUpdateAction,
        TagUpdateParams
      >(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: {
          name: 'Updated Tag',
          color: 'blue',
          isHighlighted: true,
          sortOrder: 5,
        },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitError');
    });
  });

  it('starts in loaded state when data is preloaded', () => {
    const repository = new MockTagRepository();
    const existing = repository.tags[0];
    const usecase = new TagUpdateUsecase(repository, {
      tagId: 1,
      tag: existing,
    });
    const tester = new UsecaseTester<
      TagUpdateUsecase,
      TagUpdateState,
      TagUpdateAction,
      TagUpdateParams
    >(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
