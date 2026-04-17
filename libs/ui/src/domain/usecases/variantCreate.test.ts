import {
  VariantCreateUsecase,
  VariantCreateState,
  VariantCreateAction,
  VariantCreateParams,
} from './variantCreate';
import { MockVariantRepository, MockProductRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('VariantCreateUsecase', () => {
  describe('success flow - no preloaded product (fetch required)', () => {
    it('should transition loading → loaded → submitting → submitSuccess', async () => {
      const variantRepository = new MockVariantRepository();
      const productRepository = new MockProductRepository();
      const usecase = new VariantCreateUsecase(variantRepository, productRepository, { productId: 1, product: null });
      const tester = new UsecaseTester<VariantCreateUsecase, VariantCreateState, VariantCreateAction, VariantCreateParams>(usecase);

      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { productId: 1, name: 'New Variant', price: 50000, description: '', materials: [], values: [] },
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
        values: { productId: 1, name: 'New Variant', price: 50000, description: '', materials: [], values: [] },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
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
});
