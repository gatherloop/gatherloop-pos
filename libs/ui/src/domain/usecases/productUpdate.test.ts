import {
  ProductUpdateUsecase,
  ProductUpdateState,
  ProductUpdateAction,
  ProductUpdateParams,
} from './productUpdate';
import { MockProductRepository, MockCategoryRepository, MockVariantRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('ProductUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    const productRepository = new MockProductRepository();
    const categoryRepository = new MockCategoryRepository();
    const variantRepository = new MockVariantRepository();
    const usecase = new ProductUpdateUsecase(
      productRepository,
      categoryRepository,
      variantRepository,
      { productId: 1, product: null, categories: [], variants: [] }
    );
    let tester: UsecaseTester<ProductUpdateUsecase, ProductUpdateState, ProductUpdateAction, ProductUpdateParams>;

    it('initializes in loading state when no data preloaded', () => {
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
        values: { categoryId: 1, name: 'Updated Product', imageUrl: '', description: '', options: [], saleType: 'purchase' },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful submit', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    const productRepository = new MockProductRepository();
    productRepository.setShouldFail(true);
    const categoryRepository = new MockCategoryRepository();
    const variantRepository = new MockVariantRepository();
    const usecase = new ProductUpdateUsecase(
      productRepository,
      categoryRepository,
      variantRepository,
      { productId: 1, product: null, categories: [], variants: [] }
    );
    let tester: UsecaseTester<ProductUpdateUsecase, ProductUpdateState, ProductUpdateAction, ProductUpdateParams>;

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
    const productRepository = new MockProductRepository();
    productRepository.setShouldFail(true);
    const categoryRepository = new MockCategoryRepository();
    const variantRepository = new MockVariantRepository();
    const usecase = new ProductUpdateUsecase(
      productRepository,
      categoryRepository,
      variantRepository,
      {
        productId: 1,
        product: productRepository.products[0],
        categories: categoryRepository.categories,
        variants: [],
      }
    );
    let tester: UsecaseTester<ProductUpdateUsecase, ProductUpdateState, ProductUpdateAction, ProductUpdateParams>;

    it('initializes in loaded state when data is preloaded', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { categoryId: 1, name: 'Updated Product', imageUrl: '', description: '', options: [], saleType: 'purchase' },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });

  it('starts in loaded state when data is preloaded', () => {
    const productRepository = new MockProductRepository();
    const categoryRepository = new MockCategoryRepository();
    const variantRepository = new MockVariantRepository();
    const existing = productRepository.products[0];
    const usecase = new ProductUpdateUsecase(
      productRepository,
      categoryRepository,
      variantRepository,
      {
        productId: 1,
        product: existing,
        categories: categoryRepository.categories,
        variants: [],
      }
    );
    const tester = new UsecaseTester<ProductUpdateUsecase, ProductUpdateState, ProductUpdateAction, ProductUpdateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
