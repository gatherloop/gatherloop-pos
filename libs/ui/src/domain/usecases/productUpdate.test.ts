import {
  ProductUpdateUsecase,
  ProductUpdateState,
  ProductUpdateAction,
  ProductUpdateParams,
} from './productUpdate';
import { MockProductRepository, MockCategoryRepository, MockVariantRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('ProductUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    it('should transition loading → loaded → submitting → submitSuccess', async () => {
      const productRepository = new MockProductRepository();
      const categoryRepository = new MockCategoryRepository();
      const variantRepository = new MockVariantRepository();
      const usecase = new ProductUpdateUsecase(
        productRepository,
        categoryRepository,
        variantRepository,
        { productId: 1, product: null, categories: [], variants: [] }
      );
      const tester = new UsecaseTester<ProductUpdateUsecase, ProductUpdateState, ProductUpdateAction, ProductUpdateParams>(usecase);

      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { categoryId: 1, name: 'Updated Product', imageUrl: '', description: '', options: [], saleType: 'purchase' },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading → error → loading → loaded', async () => {
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
      const tester = new UsecaseTester<ProductUpdateUsecase, ProductUpdateState, ProductUpdateAction, ProductUpdateParams>(usecase);

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
      const tester = new UsecaseTester<ProductUpdateUsecase, ProductUpdateState, ProductUpdateAction, ProductUpdateParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { categoryId: 1, name: 'Updated Product', imageUrl: '', description: '', options: [], saleType: 'purchase' },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
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
