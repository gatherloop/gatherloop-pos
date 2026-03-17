import {
  TransactionItemSelectUsecase,
  TransactionItemSelectState,
  TransactionItemSelectAction,
  TransactionItemSelectParams,
} from './transactionItemSelect';
import { MockProductRepository, MockVariantRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TransactionItemSelectUsecase', () => {
  describe('success flow - load products', () => {
    it('should transition loading → loaded', async () => {
      const productRepository = new MockProductRepository();
      const variantRepository = new MockVariantRepository();
      const usecase = new TransactionItemSelectUsecase(productRepository, variantRepository, {
        products: [],
        totalItem: 0,
      });
      const tester = new UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>(usecase);

      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('success flow - select product with multiple option values', () => {
    it('should transition loaded → selectingOptions → loadingVariant → loaded', async () => {
      const productRepository = new MockProductRepository();
      const variantRepository = new MockVariantRepository();
      // Product 1 has 1 option with 2 values (S and M), so goes to selectingOptions
      const usecase = new TransactionItemSelectUsecase(productRepository, variantRepository, {
        products: productRepository.products,
        totalItem: productRepository.products.length,
      });
      const tester = new UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      // Product 1 has option with values [S, M] (2 values) so it goes to selectingOptions
      tester.dispatch({ type: 'SELECT_PRODUCT', product: productRepository.products[0] });
      expect(tester.state.type).toBe('selectingOptions');

      tester.dispatch({ type: 'FETCH_VARIANT' });
      expect(tester.state.type).toBe('loadingVariant');

      await flushPromises();
      // loadingVariantSuccess -> onStateChange dispatches RESET -> loaded
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('success flow - select product with single option single value', () => {
    it('should transition loaded → loadingVariant → loaded', async () => {
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
      const tester = new UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SELECT_PRODUCT', product: singleValueProduct });
      expect(tester.state.type).toBe('loadingVariant');

      await flushPromises();
      // loadingVariantSuccess -> onStateChange dispatches RESET -> loaded
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const productRepository = new MockProductRepository();
      productRepository.setShouldFail(true);
      const variantRepository = new MockVariantRepository();
      const usecase = new TransactionItemSelectUsecase(productRepository, variantRepository, {
        products: [],
        totalItem: 0,
      });
      const tester = new UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>(usecase);

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
