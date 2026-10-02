import { TagDeleteUsecase, TagDeleteState, TagDeleteAction } from './tagDelete';
import { MockTagRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TagDeleteUsecase', () => {
  describe('success flow', () => {
    it('should transition hidden → shown → deleting → hidden', async () => {
      const repository = new MockTagRepository();
      const usecase = new TagDeleteUsecase(repository);
      const tester = new UsecaseTester<
        TagDeleteUsecase,
        TagDeleteState,
        TagDeleteAction,
        undefined
      >(usecase);

      expect(tester.state).toEqual({ type: 'hidden', tagId: null });

      tester.dispatch({ type: 'SHOW_CONFIRMATION', tagId: 1 });
      expect(tester.state).toEqual({ type: 'shown', tagId: 1 });

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      expect(tester.state.type).toBe('hidden');
    });
  });

  it('transitions to hidden when HIDE_CONFIRMATION is dispatched from shown', () => {
    const repository = new MockTagRepository();
    const usecase = new TagDeleteUsecase(repository);
    const tester = new UsecaseTester<
      TagDeleteUsecase,
      TagDeleteState,
      TagDeleteAction,
      undefined
    >(usecase);
    tester.dispatch({ type: 'SHOW_CONFIRMATION', tagId: 1 });
    tester.dispatch({ type: 'HIDE_CONFIRMATION' });
    expect(tester.state.type).toBe('hidden');
  });

  describe('error flow', () => {
    it('should transition hidden → shown → deleting → shown (auto-recovery)', async () => {
      const repository = new MockTagRepository();
      repository.setShouldFail(true);
      const usecase = new TagDeleteUsecase(repository);
      const tester = new UsecaseTester<
        TagDeleteUsecase,
        TagDeleteState,
        TagDeleteAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('hidden');

      tester.dispatch({ type: 'SHOW_CONFIRMATION', tagId: 1 });
      expect(tester.state.type).toBe('shown');

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      expect(tester.state.type).toBe('shown');
    });
  });
});
