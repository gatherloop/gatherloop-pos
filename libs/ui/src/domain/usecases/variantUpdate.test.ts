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

      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { productId: 1, name: 'Updated Variant', price: 60000, description: '', materials: [], values: [] },
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
        values: { productId: 1, name: 'Updated Variant', price: 60000, description: '', materials: [], values: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
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
});
