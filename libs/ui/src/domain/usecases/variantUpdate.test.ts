import {
  VariantUpdateUsecase,
  VariantUpdateState,
  VariantUpdateAction,
  VariantUpdateParams,
} from './variantUpdate';
import { MockVariantRepository, MockProductRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('VariantUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    it('should transition loading → loaded → submitting → submitSuccess', async () => {
      const variantRepository = new MockVariantRepository();
      const productRepository = new MockProductRepository();
      const usecase = new VariantUpdateUsecase(variantRepository, productRepository, {
        variantId: 1,
        variant: null,
        productId: 1,
        product: null,
      });
      const tester = new UsecaseTester<VariantUpdateUsecase, VariantUpdateState, VariantUpdateAction, VariantUpdateParams>(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { productId: 1, name: 'Updated Variant', price: 60000, description: '', materials: [], values: [], pricingTiers: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const variantRepository = new MockVariantRepository();
      variantRepository.setShouldFail(true);
      const productRepository = new MockProductRepository();
      const usecase = new VariantUpdateUsecase(variantRepository, productRepository, {
        variantId: 1,
        variant: null,
        productId: 1,
        product: null,
      });
      const tester = new UsecaseTester<VariantUpdateUsecase, VariantUpdateState, VariantUpdateAction, VariantUpdateParams>(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('error');

      variantRepository.setShouldFail(false);
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
      const usecase = new VariantUpdateUsecase(variantRepository, productRepository, {
        variantId: 1,
        variant: variantRepository.variants[0],
        productId: 1,
        product: productRepository.products[0],
      });
      const tester = new UsecaseTester<VariantUpdateUsecase, VariantUpdateState, VariantUpdateAction, VariantUpdateParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { productId: 1, name: 'Updated Variant', price: 60000, description: '', materials: [], values: [], pricingTiers: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitError');
    });
  });

  it('starts in loaded state when data is preloaded', () => {
    const variantRepository = new MockVariantRepository();
    const productRepository = new MockProductRepository();
    const existing = variantRepository.variants[0];
    const usecase = new VariantUpdateUsecase(variantRepository, productRepository, {
      variantId: 1,
      variant: existing,
      productId: 1,
      product: productRepository.products[0],
    });
    const tester = new UsecaseTester<VariantUpdateUsecase, VariantUpdateState, VariantUpdateAction, VariantUpdateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });

  it('pre-fills recipe from the fetched variant', () => {
    const variantRepository = new MockVariantRepository();
    const productRepository = new MockProductRepository();
    const existing = { ...variantRepository.variants[0], recipe: 'Shake well before serving' };
    const usecase = new VariantUpdateUsecase(variantRepository, productRepository, {
      variantId: 1,
      variant: existing,
      productId: 1,
      product: productRepository.products[0],
    });
    const tester = new UsecaseTester<VariantUpdateUsecase, VariantUpdateState, VariantUpdateAction, VariantUpdateParams>(usecase);
    expect(tester.state.values.recipe).toBe('Shake well before serving');
  });

  it('persists an updated recipe', async () => {
    const variantRepository = new MockVariantRepository();
    const productRepository = new MockProductRepository();
    const existing = variantRepository.variants[0];
    const usecase = new VariantUpdateUsecase(variantRepository, productRepository, {
      variantId: existing.id,
      variant: existing,
      productId: 1,
      product: productRepository.products[0],
    });
    const tester = new UsecaseTester<VariantUpdateUsecase, VariantUpdateState, VariantUpdateAction, VariantUpdateParams>(usecase);

    tester.dispatch({
      type: 'SUBMIT',
      values: {
        productId: 1,
        name: existing.name,
        price: existing.price,
        description: '',
        recipe: 'Shake well before serving',
        materials: [],
        values: [],
        pricingTiers: [],
      },
    });

    await flushPromises();
    expect(tester.state.type).toBe('submitSuccess');
    expect(variantRepository.variants.find((v) => v.id === existing.id)?.recipe).toBe('Shake well before serving');
  });

  it('pre-fills imageUrl from the fetched variant, empty when absent', () => {
    const variantRepository = new MockVariantRepository();
    const productRepository = new MockProductRepository();
    const buildTester = (variant: (typeof variantRepository.variants)[number]) =>
      new UsecaseTester<VariantUpdateUsecase, VariantUpdateState, VariantUpdateAction, VariantUpdateParams>(
        new VariantUpdateUsecase(variantRepository, productRepository, {
          variantId: 1,
          variant,
          productId: 1,
          product: productRepository.products[0],
        })
      );

    const withImage = buildTester({ ...variantRepository.variants[0], imageUrl: 'https://example.com/ice-cream.jpg' });
    const withoutImage = buildTester({ ...variantRepository.variants[0], imageUrl: undefined });

    expect(withImage.state.values.imageUrl).toBe('https://example.com/ice-cream.jpg');
    expect(withoutImage.state.values.imageUrl).toBe('');
  });

  it.each([
    ['persists an updated imageUrl', undefined, 'https://example.com/ice-cream.jpg', 'https://example.com/ice-cream.jpg'],
    ['clears the imageUrl when emptied', 'https://example.com/ice-cream.jpg', '', undefined],
  ])('%s', async (_name, initialImageUrl, submittedImageUrl, expectedImageUrl) => {
    const variantRepository = new MockVariantRepository();
    const productRepository = new MockProductRepository();
    const existing = { ...variantRepository.variants[0], imageUrl: initialImageUrl };
    variantRepository.variants[0] = existing;
    const usecase = new VariantUpdateUsecase(variantRepository, productRepository, {
      variantId: existing.id,
      variant: existing,
      productId: 1,
      product: productRepository.products[0],
    });
    const tester = new UsecaseTester<VariantUpdateUsecase, VariantUpdateState, VariantUpdateAction, VariantUpdateParams>(usecase);

    tester.dispatch({
      type: 'SUBMIT',
      values: {
        productId: 1,
        name: existing.name,
        price: existing.price,
        description: '',
        recipe: '',
        imageUrl: submittedImageUrl,
        materials: [],
        values: [],
        pricingTiers: [],
      },
    });

    await flushPromises();
    expect(tester.state.type).toBe('submitSuccess');
    expect(variantRepository.variants.find((v) => v.id === existing.id)?.imageUrl).toBe(expectedImageUrl);
  });
});
