import {
  ProductCreateUsecase,
  ProductCreateState,
  ProductCreateAction,
  ProductCreateParams,
} from './productCreate';
import { MockProductRepository, MockCategoryRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('ProductCreateUsecase', () => {
  describe('success flow - no preloaded categories (fetch required)', () => {
    it('should transition loading → loaded → submitting → submitSuccess', async () => {
      const productRepository = new MockProductRepository();
      const categoryRepository = new MockCategoryRepository();
      const usecase = new ProductCreateUsecase(productRepository, categoryRepository, { categories: [] });
      const tester = new UsecaseTester<ProductCreateUsecase, ProductCreateState, ProductCreateAction, ProductCreateParams>(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { categoryId: 1, name: 'New Product', imageUrl: '', description: '', options: [], saleType: 'purchase', status: 'published', availabilityTracking: 'none' },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const productRepository = new MockProductRepository();
      const categoryRepository = new MockCategoryRepository();
      categoryRepository.setShouldFail(true);
      const usecase = new ProductCreateUsecase(productRepository, categoryRepository, { categories: [] });
      const tester = new UsecaseTester<ProductCreateUsecase, ProductCreateState, ProductCreateAction, ProductCreateParams>(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('error');

      categoryRepository.setShouldFail(false);
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
      const usecase = new ProductCreateUsecase(productRepository, categoryRepository, {
        categories: categoryRepository.categories,
      });
      const tester = new UsecaseTester<ProductCreateUsecase, ProductCreateState, ProductCreateAction, ProductCreateParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({
        type: 'SUBMIT',
        values: { categoryId: 1, name: 'New Product', imageUrl: '', description: '', options: [], saleType: 'purchase', status: 'published', availabilityTracking: 'none' },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitError');
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

  it('defaults status to published for a new product', () => {
    const productRepository = new MockProductRepository();
    const categoryRepository = new MockCategoryRepository();
    const usecase = new ProductCreateUsecase(productRepository, categoryRepository, {
      categories: categoryRepository.categories,
    });
    const tester = new UsecaseTester<ProductCreateUsecase, ProductCreateState, ProductCreateAction, ProductCreateParams>(usecase);
    expect(tester.state.values.status).toBe('published');
  });

  it('defaults availabilityTracking to none for a new product', () => {
    const productRepository = new MockProductRepository();
    const categoryRepository = new MockCategoryRepository();
    const usecase = new ProductCreateUsecase(productRepository, categoryRepository, {
      categories: categoryRepository.categories,
    });
    const tester = new UsecaseTester<ProductCreateUsecase, ProductCreateState, ProductCreateAction, ProductCreateParams>(usecase);
    expect(tester.state.values.availabilityTracking).toBe('none');
  });

  it('persists availabilityTracking when submitting a new product', async () => {
    const productRepository = new MockProductRepository();
    const categoryRepository = new MockCategoryRepository();
    const usecase = new ProductCreateUsecase(productRepository, categoryRepository, {
      categories: categoryRepository.categories,
    });
    const tester = new UsecaseTester<ProductCreateUsecase, ProductCreateState, ProductCreateAction, ProductCreateParams>(usecase);

    tester.dispatch({
      type: 'SUBMIT',
      values: { categoryId: 1, name: 'Tracked Product', imageUrl: '', description: '', options: [], saleType: 'purchase', status: 'published', availabilityTracking: 'variant' },
    });

    await flushPromises();
    expect(tester.state.type).toBe('submitSuccess');
    expect(productRepository.products.at(-1)?.availabilityTracking).toBe('variant');
  });

  it('persists status: draft when submitting a draft product', async () => {
    const productRepository = new MockProductRepository();
    const categoryRepository = new MockCategoryRepository();
    const usecase = new ProductCreateUsecase(productRepository, categoryRepository, {
      categories: categoryRepository.categories,
    });
    const tester = new UsecaseTester<ProductCreateUsecase, ProductCreateState, ProductCreateAction, ProductCreateParams>(usecase);

    tester.dispatch({
      type: 'SUBMIT',
      values: { categoryId: 1, name: 'Draft Product', imageUrl: '', description: '', options: [], saleType: 'purchase', status: 'draft', availabilityTracking: 'none' },
    });

    await flushPromises();
    expect(tester.state.type).toBe('submitSuccess');
    expect(productRepository.products.at(-1)?.status).toBe('draft');
  });

  it('persists recipe when submitting a new product', async () => {
    const productRepository = new MockProductRepository();
    const categoryRepository = new MockCategoryRepository();
    const usecase = new ProductCreateUsecase(productRepository, categoryRepository, {
      categories: categoryRepository.categories,
    });
    const tester = new UsecaseTester<ProductCreateUsecase, ProductCreateState, ProductCreateAction, ProductCreateParams>(usecase);

    tester.dispatch({
      type: 'SUBMIT',
      values: {
        categoryId: 1,
        name: 'New Product',
        imageUrl: '',
        description: '',
        recipe: 'Steep for 3 minutes',
        options: [],
        saleType: 'purchase',
        status: 'published',
        availabilityTracking: 'none',
      },
    });

    await flushPromises();
    expect(tester.state.type).toBe('submitSuccess');
    expect(productRepository.products.at(-1)?.recipe).toBe('Steep for 3 minutes');
  });
});
