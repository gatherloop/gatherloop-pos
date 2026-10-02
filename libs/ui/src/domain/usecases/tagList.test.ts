import {
  TagListUsecase,
  TagListAction,
  TagListState,
  TagListParams,
} from './tagList';
import { MockTagRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TagListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → revalidating → loaded', async () => {
      const repository = new MockTagRepository();
      const usecase = new TagListUsecase(repository, { tags: [] });
      const tagList = new UsecaseTester<
        TagListUsecase,
        TagListState,
        TagListAction,
        TagListParams
      >(usecase);

      expect(tagList.state).toEqual({
        type: 'loading',
        tags: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(tagList.state).toEqual({
        type: 'loaded',
        tags: repository.tags,
        errorMessage: null,
      });

      tagList.dispatch({ type: 'FETCH' });
      expect(tagList.state).toEqual({
        type: 'revalidating',
        tags: repository.tags,
        errorMessage: null,
      });

      await flushPromises();
      expect(tagList.state).toEqual({
        type: 'loaded',
        tags: repository.tags,
        errorMessage: null,
      });
    });
  });

  describe('failed flow', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockTagRepository();
      repository.setShouldFail(true);
      const usecase = new TagListUsecase(repository, { tags: [] });
      const tagList = new UsecaseTester<
        TagListUsecase,
        TagListState,
        TagListAction,
        TagListParams
      >(usecase);

      expect(tagList.state).toEqual({
        type: 'loading',
        tags: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(tagList.state).toEqual({
        type: 'error',
        tags: [],
        errorMessage: 'Failed to fetch tags',
      });

      repository.setShouldFail(false);
      tagList.dispatch({ type: 'FETCH' });
      expect(tagList.state).toEqual({
        type: 'loading',
        tags: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(tagList.state).toEqual({
        type: 'loaded',
        tags: repository.tags,
        errorMessage: null,
      });
    });
  });

  it('show loaded state when initial data is given', async () => {
    const repository = new MockTagRepository();

    const tags = [
      {
        id: 1,
        name: 'Tag Test 1',
        color: 'red' as const,
        isHighlighted: false,
        sortOrder: 0,
        variantCount: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    const usecase = new TagListUsecase(repository, { tags });

    const tagList = new UsecaseTester<
      TagListUsecase,
      TagListState,
      TagListAction,
      TagListParams
    >(usecase);

    expect(tagList.state).toEqual({
      type: 'loaded',
      tags,
      errorMessage: null,
    });
  });
});
