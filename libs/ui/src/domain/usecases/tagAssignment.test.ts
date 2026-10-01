import {
  TagAssignmentUsecase,
  TagAssignmentState,
  TagAssignmentAction,
  TagAssignmentParams,
} from './tagAssignment';
import {
  MockTagRepository,
  MockVariantRepository,
  createMenuVariants,
  mockTags,
} from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

const PANCONG_ID = 11;
const SALTED_CARAMEL_ID = 12;
const COFFEE_LATTE_ID = 13;
const PANCONG_ICE_CREAM_ID = 104;
const SALTED_CARAMEL_ORIGINAL_ID = 105;
const COFFEE_LATTE_IDS = [106, 107];

const createTester = (
  options: { taggedVariantIds?: number[]; shouldFail?: boolean } = {}
) => {
  const tagRepository = new MockTagRepository();
  const variantRepository = new MockVariantRepository();
  variantRepository.variants = createMenuVariants().map((variant) =>
    (options.taggedVariantIds ?? []).includes(variant.id)
      ? {
          ...variant,
          tags: [{ tag: mockTags[0], taggedAt: '2024-03-22T00:00:00.000Z' }],
        }
      : variant
  );
  if (options.shouldFail) tagRepository.setShouldFail(true);

  const usecase = new TagAssignmentUsecase(tagRepository, variantRepository, {
    tagId: mockTags[0].id,
  });
  const tester = new UsecaseTester<
    TagAssignmentUsecase,
    TagAssignmentState,
    TagAssignmentAction,
    TagAssignmentParams
  >(usecase);
  return { tester, tagRepository };
};

describe('TagAssignmentUsecase', () => {
  describe('loading', () => {
    it('should transition loading → loaded with already-tagged variants selected', async () => {
      const { tester } = createTester({
        taggedVariantIds: [PANCONG_ICE_CREAM_ID, SALTED_CARAMEL_ORIGINAL_ID],
      });
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
      expect(tester.state.tag?.id).toBe(mockTags[0].id);
      expect(tester.state.variants).toHaveLength(7);
      expect(tester.state.selectedVariantIds).toEqual([
        PANCONG_ICE_CREAM_ID,
        SALTED_CARAMEL_ORIGINAL_ID,
      ]);
    });

    it('should transition loading → error → loading → loaded on retry', async () => {
      const { tester, tagRepository } = createTester({ shouldFail: true });

      await flushPromises();
      expect(tester.state.type).toBe('error');
      expect(tester.state.errorMessage).toBe('Failed to fetch tag assignments');

      tagRepository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('toggling', () => {
    it('should select every variant when ticking a product', async () => {
      const { tester } = createTester();
      await flushPromises();

      tester.dispatch({ type: 'TOGGLE_PRODUCT', productId: COFFEE_LATTE_ID });
      expect(tester.state.selectedVariantIds).toEqual(COFFEE_LATTE_IDS);
    });

    it('should clear every variant when unticking a fully selected product', async () => {
      const { tester } = createTester({ taggedVariantIds: COFFEE_LATTE_IDS });
      await flushPromises();

      tester.dispatch({ type: 'TOGGLE_PRODUCT', productId: COFFEE_LATTE_ID });
      expect(tester.state.selectedVariantIds).toEqual([]);
    });

    it('should leave a product partially selected when unticking one of its variants', async () => {
      const { tester } = createTester({ taggedVariantIds: COFFEE_LATTE_IDS });
      await flushPromises();

      tester.dispatch({
        type: 'TOGGLE_VARIANT',
        variantId: COFFEE_LATTE_IDS[1],
      });
      expect(tester.state.selectedVariantIds).toEqual([COFFEE_LATTE_IDS[0]]);
    });

    it('should select the remaining variants when ticking a partially selected product', async () => {
      const { tester } = createTester({
        taggedVariantIds: [PANCONG_ICE_CREAM_ID],
      });
      await flushPromises();

      tester.dispatch({ type: 'TOGGLE_PRODUCT', productId: PANCONG_ID });
      expect([...tester.state.selectedVariantIds].sort()).toEqual([
        101, 102, 103, 104,
      ]);
    });

    it('should toggle a single-variant product through its only variant', async () => {
      const { tester } = createTester();
      await flushPromises();

      tester.dispatch({ type: 'TOGGLE_PRODUCT', productId: SALTED_CARAMEL_ID });
      expect(tester.state.selectedVariantIds).toEqual([
        SALTED_CARAMEL_ORIGINAL_ID,
      ]);

      tester.dispatch({ type: 'TOGGLE_PRODUCT', productId: SALTED_CARAMEL_ID });
      expect(tester.state.selectedVariantIds).toEqual([]);
    });
  });

  describe('search', () => {
    it('should store the search query without touching the selection', async () => {
      const { tester } = createTester({
        taggedVariantIds: [PANCONG_ICE_CREAM_ID],
      });
      await flushPromises();

      tester.dispatch({ type: 'SEARCH', query: 'latte' });
      expect(tester.state.query).toBe('latte');
      expect(tester.state.selectedVariantIds).toEqual([PANCONG_ICE_CREAM_ID]);
    });
  });

  describe('saving', () => {
    it('should send exactly the ticked variant ids and reach saveSuccess', async () => {
      const { tester, tagRepository } = createTester({
        taggedVariantIds: [PANCONG_ICE_CREAM_ID],
      });
      await flushPromises();

      tester.dispatch({ type: 'TOGGLE_PRODUCT', productId: SALTED_CARAMEL_ID });
      tester.dispatch({
        type: 'TOGGLE_VARIANT',
        variantId: PANCONG_ICE_CREAM_ID,
      });
      tester.dispatch({ type: 'SAVE' });
      expect(tester.state.type).toBe('saving');

      await flushPromises();
      expect(tester.state.type).toBe('saveSuccess');
      expect(tagRepository.lastSubmittedVariantIds).toEqual([
        SALTED_CARAMEL_ORIGINAL_ID,
      ]);
    });

    it('should reach saveError and allow saving again', async () => {
      const { tester, tagRepository } = createTester();
      await flushPromises();

      tagRepository.setShouldFail(true);
      tester.dispatch({ type: 'SAVE' });
      await flushPromises();
      expect(tester.state.type).toBe('saveError');
      expect(tester.state.errorMessage).toBe('Save failed');

      tagRepository.setShouldFail(false);
      tester.dispatch({ type: 'SAVE' });
      expect(tester.state.type).toBe('saving');

      await flushPromises();
      expect(tester.state.type).toBe('saveSuccess');
    });
  });
});
