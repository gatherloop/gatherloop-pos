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

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('success flow - select product with multiple option values', () => {
    it('should transition loaded → selectingOptions → loadingVariant → loaded', async () => {
      const productRepository = new MockProductRepository();
      const variantRepository = new MockVariantRepository();
      const usecase = new TransactionItemSelectUsecase(productRepository, variantRepository, {
        products: productRepository.products,
        totalItem: productRepository.products.length,
      });
      const tester = new UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SELECT_PRODUCT', product: productRepository.products[0] });
      expect(tester.state.type).toBe('selectingOptions');

      tester.dispatch({ type: 'FETCH_VARIANT' });
      expect(tester.state.type).toBe('loadingVariant');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('success flow - select product with single option single value', () => {
    it('should transition loaded → loadingVariant → loaded', async () => {
      const productRepository = new MockProductRepository();
      const variantRepository = new MockVariantRepository();
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

  describe('status filter', () => {
    it('requests only published products by default', async () => {
      const productRepository = new MockProductRepository();
      const fetchProductListSpy = jest.spyOn(productRepository, 'fetchProductList');
      const variantRepository = new MockVariantRepository();
      const usecase = new TransactionItemSelectUsecase(productRepository, variantRepository, {
        products: [],
        totalItem: 0,
      });
      new UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>(usecase);

      await flushPromises();

      expect(fetchProductListSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'published' })
      );
    });

    it('allows overriding the status filter via params', async () => {
      const productRepository = new MockProductRepository();
      const fetchProductListSpy = jest.spyOn(productRepository, 'fetchProductList');
      const variantRepository = new MockVariantRepository();
      const usecase = new TransactionItemSelectUsecase(productRepository, variantRepository, {
        products: [],
        totalItem: 0,
        status: 'all',
      });
      new UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>(usecase);

      await flushPromises();

      expect(fetchProductListSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'all' })
      );
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

  describe('switching between products', () => {
    it('resets amount to 1 when a different product is selected after canceling', async () => {
      const productRepository = new MockProductRepository();
      const variantRepository = new MockVariantRepository();
      const usecase = new TransactionItemSelectUsecase(productRepository, variantRepository, {
        products: productRepository.products,
        totalItem: productRepository.products.length,
      });
      const tester = new UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>(usecase);

      tester.dispatch({ type: 'SELECT_PRODUCT', product: productRepository.products[0] });
      tester.dispatch({ type: 'CHANGE_AMOUNT', amount: 5 });
      expect(tester.state.amount).toBe(5);

      tester.dispatch({ type: 'UNSELECT_PRODUCT' });
      tester.dispatch({ type: 'SELECT_PRODUCT', product: productRepository.products[1] });

      expect(tester.state.amount).toBe(1);
    });
  });

  describe('soft-check on submit — availability may have changed since the picker opened', () => {
    it('clamps the amount down when the fresh variant has less stock left', async () => {
      const productRepository = new MockProductRepository();
      const variantRepository = new MockVariantRepository();
      const usecase = new TransactionItemSelectUsecase(productRepository, variantRepository, {
        products: productRepository.products,
        totalItem: productRepository.products.length,
      });
      const tester = new UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>(usecase);

      tester.dispatch({ type: 'SELECT_PRODUCT', product: productRepository.products[0] });
      tester.dispatch({ type: 'CHANGE_AMOUNT', amount: 5 });

      variantRepository.variants[0].isSellable = true;
      variantRepository.variants[0].sellableQuantity = 2;

      tester.dispatch({ type: 'FETCH_VARIANT' });
      await flushPromises();

      expect(tester.state.type).toBe('selectingOptions');
      expect(tester.state.amount).toBe(2);
      expect(tester.state.selectedVariant).toBeUndefined();
    });

    it('bounces back to selectingOptions instead of adding an item that just went sold out', async () => {
      const productRepository = new MockProductRepository();
      const variantRepository = new MockVariantRepository();
      const usecase = new TransactionItemSelectUsecase(productRepository, variantRepository, {
        products: productRepository.products,
        totalItem: productRepository.products.length,
      });
      const tester = new UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>(usecase);

      tester.dispatch({ type: 'SELECT_PRODUCT', product: productRepository.products[0] });
      tester.dispatch({ type: 'CHANGE_AMOUNT', amount: 1 });

      variantRepository.variants[0].sellableQuantity = undefined;
      variantRepository.variants[0].isSellable = false;

      tester.dispatch({ type: 'FETCH_VARIANT' });
      await flushPromises();

      expect(tester.state.type).toBe('selectingOptions');
      expect(tester.state.selectedVariant).toBeUndefined();
    });

    it('proceeds to loadingVariantSuccess when the fresh variant still has enough stock', async () => {
      const productRepository = new MockProductRepository();
      const variantRepository = new MockVariantRepository();
      const usecase = new TransactionItemSelectUsecase(productRepository, variantRepository, {
        products: productRepository.products,
        totalItem: productRepository.products.length,
      });
      const tester = new UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>(usecase);

      tester.dispatch({ type: 'SELECT_PRODUCT', product: productRepository.products[0] });
      tester.dispatch({ type: 'CHANGE_AMOUNT', amount: 2 });

      variantRepository.variants[0].isSellable = true;
      variantRepository.variants[0].sellableQuantity = 5;

      tester.dispatch({ type: 'FETCH_VARIANT' });
      await flushPromises();

      expect(tester.state.type).toBe('loaded');
      expect(tester.state.amount).toBe(2);
    });
  });

  describe('rental products — product availability does not apply', () => {
    const createRentalTester = () => {
      const productRepository = new MockProductRepository();
      const variantRepository = new MockVariantRepository();
      const rentalProduct = {
        ...productRepository.products[0],
        saleType: 'rental' as const,
        isSellable: false,
      };
      productRepository.products = [rentalProduct];
      const usecase = new TransactionItemSelectUsecase(productRepository, variantRepository, {
        products: [rentalProduct],
        totalItem: 1,
        saleType: 'rental',
      });
      const tester = new UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>(usecase);

      return { rentalProduct, tester, variantRepository };
    };

    it('adds the item instead of bouncing back to the options dialog', async () => {
      const { rentalProduct, tester, variantRepository } = createRentalTester();

      tester.dispatch({ type: 'SELECT_PRODUCT', product: rentalProduct });
      tester.dispatch({ type: 'CHANGE_AMOUNT', amount: 2 });

      variantRepository.variants[0].isSellable = false;
      variantRepository.variants[0].sellableQuantity = undefined;

      tester.dispatch({ type: 'FETCH_VARIANT' });
      await flushPromises();

      expect(tester.state.type).toBe('loaded');
      expect(tester.state.amount).toBe(2);
    });

    it('does not clamp the amount to a sellable quantity that does not apply', async () => {
      const { rentalProduct, tester, variantRepository } = createRentalTester();

      tester.dispatch({ type: 'SELECT_PRODUCT', product: rentalProduct });
      tester.dispatch({ type: 'CHANGE_AMOUNT', amount: 3 });

      variantRepository.variants[0].isSellable = false;
      variantRepository.variants[0].sellableQuantity = 0;

      tester.dispatch({ type: 'FETCH_VARIANT' });
      await flushPromises();

      expect(tester.state.type).toBe('loaded');
      expect(tester.state.amount).toBe(3);
    });
  });

  describe('re-selecting the same product', () => {
    it('refetches the product variants after the previous selection was submitted', async () => {
      const productRepository = new MockProductRepository();
      const variantRepository = new MockVariantRepository();
      variantRepository.variants[0].isSellable = true;
      variantRepository.variants[0].sellableQuantity = undefined;
      const fetchVariantListSpy = jest.spyOn(variantRepository, 'fetchVariantList');
      const usecase = new TransactionItemSelectUsecase(productRepository, variantRepository, {
        products: productRepository.products,
        totalItem: productRepository.products.length,
      });
      const tester = new UsecaseTester<TransactionItemSelectUsecase, TransactionItemSelectState, TransactionItemSelectAction, TransactionItemSelectParams>(usecase);

      tester.dispatch({ type: 'SELECT_PRODUCT', product: productRepository.products[0] });
      await flushPromises();

      tester.dispatch({ type: 'FETCH_VARIANT' });
      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      fetchVariantListSpy.mockClear();
      tester.dispatch({ type: 'SELECT_PRODUCT', product: productRepository.products[0] });
      await flushPromises();

      expect(fetchVariantListSpy).toHaveBeenCalledWith(
        expect.objectContaining({ productId: productRepository.products[0].id })
      );
      expect(tester.state.selectedProductVariants.length).toBeGreaterThan(0);
    });
  });
});
