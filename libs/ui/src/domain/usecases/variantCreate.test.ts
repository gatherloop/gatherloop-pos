import {
  VariantCreateUsecase,
  VariantCreateState,
  VariantCreateAction,
  VariantCreateParams,
} from './variantCreate';
import { MockVariantRepository, MockProductRepository, mockTags } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('VariantCreateUsecase', () => {
  describe('success flow - no preloaded product (fetch required)', () => {
    it('should transition loading → loaded → submitting → submitSuccess', async () => {
      const variantRepository = new MockVariantRepository();
      const productRepository = new MockProductRepository();
      const usecase = new VariantCreateUsecase(variantRepository, productRepository, { productId: 1, product: null });
      const tester = new UsecaseTester<VariantCreateUsecase, VariantCreateState, VariantCreateAction, VariantCreateParams>(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { productId: 1, name: 'New Variant', price: 50000, description: '', materials: [], values: [], pricingTiers: [], tagIds: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const variantRepository = new MockVariantRepository();
      const productRepository = new MockProductRepository();
      productRepository.setShouldFail(true);
      const usecase = new VariantCreateUsecase(variantRepository, productRepository, { productId: 1, product: null });
      const tester = new UsecaseTester<VariantCreateUsecase, VariantCreateState, VariantCreateAction, VariantCreateParams>(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('error');

      productRepository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - submit error', () => {
    it('should transition loaded → submitting → loaded (auto-recover)', async () => {
      const variantRepository = new MockVariantRepository();
      variantRepository.setShouldFail(true);
      const productRepository = new MockProductRepository();
      const usecase = new VariantCreateUsecase(variantRepository, productRepository, {
        productId: 1,
        product: productRepository.products[0],
      });
      const tester = new UsecaseTester<VariantCreateUsecase, VariantCreateState, VariantCreateAction, VariantCreateParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { productId: 1, name: 'New Variant', price: 50000, description: '', materials: [], values: [], pricingTiers: [], tagIds: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitError');
    });
  });

  it('starts in loaded state when product is preloaded', () => {
    const variantRepository = new MockVariantRepository();
    const productRepository = new MockProductRepository();
    const usecase = new VariantCreateUsecase(variantRepository, productRepository, {
      productId: 1,
      product: productRepository.products[0],
    });
    const tester = new UsecaseTester<VariantCreateUsecase, VariantCreateState, VariantCreateAction, VariantCreateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });

  it('persists recipe when submitting a new variant', async () => {
    const variantRepository = new MockVariantRepository();
    const productRepository = new MockProductRepository();
    const usecase = new VariantCreateUsecase(variantRepository, productRepository, {
      productId: 1,
      product: productRepository.products[0],
    });
    const tester = new UsecaseTester<VariantCreateUsecase, VariantCreateState, VariantCreateAction, VariantCreateParams>(usecase);

    tester.dispatch({
      type: 'SUBMIT',
      values: {
        productId: 1,
        name: 'New Variant',
        price: 50000,
        description: '',
        recipe: 'Shake well before serving',
        materials: [],
        values: [],
        pricingTiers: [],
        tagIds: [],
      },
    });

    await flushPromises();
    expect(tester.state.type).toBe('submitSuccess');
    expect(variantRepository.variants.at(-1)?.recipe).toBe('Shake well before serving');
  });

  it('starts with an empty imageUrl and persists one when submitting', async () => {
    const variantRepository = new MockVariantRepository();
    const productRepository = new MockProductRepository();
    const usecase = new VariantCreateUsecase(variantRepository, productRepository, {
      productId: 1,
      product: productRepository.products[0],
    });
    const tester = new UsecaseTester<VariantCreateUsecase, VariantCreateState, VariantCreateAction, VariantCreateParams>(usecase);
    expect(tester.state.values.imageUrl).toBe('');

    tester.dispatch({
      type: 'SUBMIT',
      values: {
        productId: 1,
        name: 'Ice Cream',
        price: 50000,
        description: '',
        recipe: '',
        imageUrl: 'https://example.com/ice-cream.jpg',
        materials: [],
        values: [],
        pricingTiers: [],
        tagIds: [],
      },
    });

    await flushPromises();
    expect(tester.state.type).toBe('submitSuccess');
    expect(variantRepository.variants.at(-1)?.imageUrl).toBe('https://example.com/ice-cream.jpg');
  });

  describe('tag pre-fill', () => {
    const buildProductWithTags = (productRepository: MockProductRepository) => {
      const [newTag, bestSellerTag] = mockTags;
      const timestamp = '2024-03-20T00:00:00.000Z';
      return {
        ...productRepository.products[0],
        tags: [
          { tag: newTag, scope: 'variant' as const, variantIds: [1], taggedAt: timestamp },
          { tag: bestSellerTag, scope: 'product' as const, variantIds: [1, 2], taggedAt: timestamp },
        ],
      };
    };

    it('pre-fills tagIds with the product-scope tags of a preloaded product', () => {
      const productRepository = new MockProductRepository();
      const usecase = new VariantCreateUsecase(new MockVariantRepository(), productRepository, {
        productId: 1,
        product: buildProductWithTags(productRepository),
      });
      const tester = new UsecaseTester<VariantCreateUsecase, VariantCreateState, VariantCreateAction, VariantCreateParams>(usecase);

      expect(tester.state.values.tagIds).toEqual([2]);
    });

    it('starts with no tagIds when the product has no tags', () => {
      const productRepository = new MockProductRepository();
      const usecase = new VariantCreateUsecase(new MockVariantRepository(), productRepository, {
        productId: 1,
        product: productRepository.products[0],
      });
      const tester = new UsecaseTester<VariantCreateUsecase, VariantCreateState, VariantCreateAction, VariantCreateParams>(usecase);

      expect(tester.state.values.tagIds).toEqual([]);
    });

    it('pre-fills tagIds once the product is fetched', async () => {
      const productRepository = new MockProductRepository();
      productRepository.products[0] = buildProductWithTags(productRepository);
      const usecase = new VariantCreateUsecase(new MockVariantRepository(), productRepository, {
        productId: 1,
        product: null,
      });
      const tester = new UsecaseTester<VariantCreateUsecase, VariantCreateState, VariantCreateAction, VariantCreateParams>(usecase);

      await flushPromises();

      expect(tester.state.type).toBe('loaded');
      expect(tester.state.values.tagIds).toEqual([2]);
    });

    it('persists the submitted tagIds', async () => {
      const variantRepository = new MockVariantRepository();
      const productRepository = new MockProductRepository();
      const usecase = new VariantCreateUsecase(variantRepository, productRepository, {
        productId: 1,
        product: productRepository.products[0],
      });
      const tester = new UsecaseTester<VariantCreateUsecase, VariantCreateState, VariantCreateAction, VariantCreateParams>(usecase);

      tester.dispatch({
        type: 'SUBMIT',
        values: { ...tester.state.values, name: 'Oat Milk', price: 50000, tagIds: [1] },
      });

      await flushPromises();
      expect(variantRepository.variants.at(-1)?.tags?.map(({ tag }) => tag.id)).toEqual([1]);
    });
  });
});
