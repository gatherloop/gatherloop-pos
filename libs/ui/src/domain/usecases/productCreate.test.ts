import {
  ProductCreateUsecase,
  ProductCreateState,
  ProductCreateAction,
  ProductCreateParams,
} from './productCreate';
import { MockProductRepository, MockCategoryRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('ProductCreateUsecase', () => {
  describe('success flow - no preloaded categories (fetch required)', () => {
    const productRepository = new MockProductRepository();
    const categoryRepository = new MockCategoryRepository();
    const usecase = new ProductCreateUsecase(productRepository, categoryRepository, { categories: [] });
    let tester: UsecaseTester<ProductCreateUsecase, ProductCreateState, ProductCreateAction, ProductCreateParams>;

    it('initializes in loading state when no categories preloaded', () => {
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
        values: { categoryId: 1, name: 'New Product', imageUrl: '', description: '', options: [], saleType: 'purchase' },
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
    const categoryRepository = new MockCategoryRepository();
    categoryRepository.setShouldFail(true);
    const usecase = new ProductCreateUsecase(productRepository, categoryRepository, { categories: [] });
    let tester: UsecaseTester<ProductCreateUsecase, ProductCreateState, ProductCreateAction, ProductCreateParams>;

    it('initializes in loading state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('error');
    });

    it('transitions to loading when FETCH is dispatched from error', () => {
      categoryRepository.setShouldFail(false);
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
    const usecase = new ProductCreateUsecase(productRepository, categoryRepository, {
      categories: categoryRepository.categories,
    });
    let tester: UsecaseTester<ProductCreateUsecase, ProductCreateState, ProductCreateAction, ProductCreateParams>;

    it('initializes in loaded state when categories are preloaded', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({
        type: 'SUBMIT',
        values: { categoryId: 1, name: 'New Product', imageUrl: '', description: '', options: [], saleType: 'purchase' },
      });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });

  it('starts in loaded state when categories are preloaded', () => {
    const productRepository = new MockProductRepository();
    const categoryRepository = new MockCategoryRepository();
    const usecase = new ProductCreateUsecase(productRepository, categoryRepository, {
      categories: categoryRepository.categories,
    });
    const tester = new UsecaseTester<ProductCreateUsecase, ProductCreateState, ProductCreateAction, ProductCreateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
