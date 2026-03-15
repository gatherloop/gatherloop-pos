import {
  TransactionItemSelectUsecase,
  TransactionItemSelectState,
  TransactionItemSelectAction,
  TransactionItemSelectParams,
} from './transactionItemSelect';
import { MockProductRepository, MockVariantRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('TransactionItemSelectUsecase', () => {
  describe('success flow - load products', () => {
    const productRepository = new MockProductRepository();
    const variantRepository = new MockVariantRepository();
    const usecase = new TransactionItemSelectUsecase(productRepository, variantRepository, {
      products: [],
      totalItem: 0,
    });
    let tester: UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>;

    it('initializes in loading state when no products preloaded', () => {
      tester = new UsecaseTester(usecase);
      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('success flow - select product with multiple option values', () => {
    const productRepository = new MockProductRepository();
    const variantRepository = new MockVariantRepository();
    // Product 1 has 1 option with 2 values (S and M), so goes to selectingOptions
    const usecase = new TransactionItemSelectUsecase(productRepository, variantRepository, {
      products: productRepository.products,
      totalItem: productRepository.products.length,
    });
    let tester: UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>;

    it('initializes in loaded state when products are preloaded', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to selectingOptions when SELECT_PRODUCT is dispatched with multi-value product', () => {
      // Product 1 has option with values [S, M] (2 values) so it goes to selectingOptions
      tester.dispatch({ type: 'SELECT_PRODUCT', product: productRepository.products[0] });
      expect(tester.state.type).toBe('selectingOptions');
    });

    it('transitions to loadingVariant when FETCH_VARIANT is dispatched', () => {
      tester.dispatch({ type: 'FETCH_VARIANT' });
      expect(tester.state.type).toBe('loadingVariant');
    });

    it('transitions to loaded after successful variant load (auto-reset via onStateChange)', async () => {
      await Promise.resolve();
      // loadingVariantSuccess -> onStateChange dispatches RESET -> loaded
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('success flow - select product with single option single value', () => {
    const productRepository = new MockProductRepository();
    const variantRepository = new MockVariantRepository();
    // Create a product with 1 option and 1 value to trigger direct loadingVariant
    const singleValueProduct = {
      ...productRepository.products[0],
      id: 99,
      options: [
        {
          id: 10,
          name: 'Size',
          values: [{ id: 10, name: 'One Size' }],
        },
      ],
    };
    const usecase = new TransactionItemSelectUsecase(productRepository, variantRepository, {
      products: [singleValueProduct],
      totalItem: 1,
    });
    let tester: UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions directly to loadingVariant when SELECT_PRODUCT is dispatched with single-value product', () => {
      tester.dispatch({ type: 'SELECT_PRODUCT', product: singleValueProduct });
      expect(tester.state.type).toBe('loadingVariant');
    });

    it('transitions to loaded after successful variant load (auto-reset via onStateChange)', async () => {
      await Promise.resolve();
      // loadingVariantSuccess -> onStateChange dispatches RESET -> loaded
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - fetch error', () => {
    const productRepository = new MockProductRepository();
    productRepository.setShouldFail(true);
    const variantRepository = new MockVariantRepository();
    const usecase = new TransactionItemSelectUsecase(productRepository, variantRepository, {
      products: [],
      totalItem: 0,
    });
    let tester: UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>;

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

  it('starts in loaded state when products are preloaded', () => {
    const productRepository = new MockProductRepository();
    const variantRepository = new MockVariantRepository();
    const usecase = new TransactionItemSelectUsecase(productRepository, variantRepository, {
      products: productRepository.products,
      totalItem: productRepository.products.length,
    });
    const tester = new UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
