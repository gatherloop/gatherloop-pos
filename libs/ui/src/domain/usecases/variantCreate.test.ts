import {
  VariantCreateUsecase,
  VariantCreateState,
  VariantCreateAction,
  VariantCreateParams,
} from './variantCreate';
import { MockVariantRepository, MockProductRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('VariantCreateUsecase', () => {
  describe('success flow - no preloaded product (fetch required)', () => {
    const variantRepository = new MockVariantRepository();
    const productRepository = new MockProductRepository();
    const usecase = new VariantCreateUsecase(variantRepository, productRepository, { productId: 1, product: null });
    let tester: UsecaseTester<VariantCreateUsecase, VariantCreateState, VariantCreateAction, VariantCreateParams>;

    it('initializes in loading state when no product preloaded', () => {
      tester = new UsecaseTester(usecase);
      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { productId: 1, name: 'New Variant', price: 50000, description: '', materials: [], values: [] },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful submit', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    const variantRepository = new MockVariantRepository();
    const productRepository = new MockProductRepository();
    productRepository.setShouldFail(true);
    const usecase = new VariantCreateUsecase(variantRepository, productRepository, { productId: 1, product: null });
    let tester: UsecaseTester<VariantCreateUsecase, VariantCreateState, VariantCreateAction, VariantCreateParams>;

    it('initializes in loading state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('error');
    });

    it('transitions to loading when FETCH is dispatched from error', () => {
      productRepository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - submit error', () => {
    const variantRepository = new MockVariantRepository();
    variantRepository.setShouldFail(true);
    const productRepository = new MockProductRepository();
    const usecase = new VariantCreateUsecase(variantRepository, productRepository, {
      productId: 1,
      product: productRepository.products[0],
    });
    let tester: UsecaseTester<VariantCreateUsecase, VariantCreateState, VariantCreateAction, VariantCreateParams>;

    it('initializes in loaded state when product is preloaded', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { productId: 1, name: 'New Variant', price: 50000, description: '', materials: [], values: [] },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
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
