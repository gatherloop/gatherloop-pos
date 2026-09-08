import {
  MenuItemDetailUsecase,
  MenuItemDetailAction,
  MenuItemDetailState,
  MenuItemDetailParams,
} from './menuItemDetail';
import { MockMenuRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

const createTester = (
  repository: MockMenuRepository,
  params: MenuItemDetailParams
) =>
  new UsecaseTester<
    MenuItemDetailUsecase,
    MenuItemDetailState,
    MenuItemDetailAction,
    MenuItemDetailParams
  >(new MenuItemDetailUsecase(repository, params));

describe('MenuItemDetailUsecase', () => {
  // D6 in docs/trd-order-app-composition-and-ssr.md: no item selected at
  // all — the menu screen's default, since one instance now serves every
  // selection instead of one route per item.
  it('stays idle, with no fetch, when constructed with no productId', async () => {
    const repository = new MockMenuRepository();
    const fetchSpy = jest.spyOn(repository, 'fetchProductById');
    const menuItemDetail = createTester(repository, { productId: null });

    expect(menuItemDetail.state).toEqual({
      type: 'idle',
      productId: null,
      product: null,
      selectedOptionValueIds: [],
      variant: null,
      amount: 1,
      note: '',
      errorMessage: null,
    });

    await flushPromises();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should transition idle → loadingProduct → selectingOptions on a product with options', async () => {
    const repository = new MockMenuRepository();
    const menuItemDetail = createTester(repository, { productId: 1 });

    expect(menuItemDetail.state).toEqual({
      type: 'loadingProduct',
      productId: 1,
      product: null,
      selectedOptionValueIds: [],
      variant: null,
      amount: 1,
      note: '',
      errorMessage: null,
    });

    await flushPromises();
    expect(menuItemDetail.state).toEqual({
      type: 'selectingOptions',
      productId: 1,
      product: repository.products[0],
      selectedOptionValueIds: [],
      variant: null,
      amount: 1,
      note: '',
      errorMessage: null,
    });
  });

  it('resolves the variant only once every option has a selected value, and the CTA is enabled exactly in ready', async () => {
    const repository = new MockMenuRepository();
    const menuItemDetail = createTester(repository, { productId: 1 });

    await flushPromises();
    expect(menuItemDetail.state.type).toBe('selectingOptions');

    menuItemDetail.dispatch({
      type: 'SELECT_OPTION_VALUE',
      optionId: 1,
      optionValueId: 1,
    });
    expect(menuItemDetail.state.type).toBe('resolvingVariant');
    expect(menuItemDetail.state.selectedOptionValueIds).toEqual([1]);

    await flushPromises();
    expect(menuItemDetail.state).toEqual({
      type: 'ready',
      productId: 1,
      product: repository.products[0],
      selectedOptionValueIds: [1],
      variant: repository.variants[0],
      amount: 1,
      note: '',
      errorMessage: null,
    });
  });

  it('goes straight to resolvingVariant for a product with no options', async () => {
    const repository = new MockMenuRepository();
    const menuItemDetail = createTester(repository, { productId: 2 });

    await flushPromises();
    await flushPromises();
    expect(menuItemDetail.state.type).toBe('ready');
    expect(menuItemDetail.state.variant).toEqual(repository.variants[2]);
  });

  it('re-resolves the variant when the selected option value changes', async () => {
    const repository = new MockMenuRepository();
    const menuItemDetail = createTester(repository, { productId: 1 });

    await flushPromises();
    menuItemDetail.dispatch({
      type: 'SELECT_OPTION_VALUE',
      optionId: 1,
      optionValueId: 1,
    });
    await flushPromises();
    expect(menuItemDetail.state.type).toBe('ready');
    expect(menuItemDetail.state.variant).toEqual(repository.variants[0]);

    menuItemDetail.dispatch({
      type: 'SELECT_OPTION_VALUE',
      optionId: 1,
      optionValueId: 2,
    });
    expect(menuItemDetail.state.type).toBe('resolvingVariant');
    expect(menuItemDetail.state.variant).toBeNull();

    await flushPromises();
    expect(menuItemDetail.state.type).toBe('ready');
    expect(menuItemDetail.state.variant).toEqual(repository.variants[1]);
  });

  it('transitions to error when the variant cannot be resolved', async () => {
    const repository = new MockMenuRepository();
    const menuItemDetail = createTester(repository, { productId: 1 });

    await flushPromises();
    repository.setShouldFail(true);
    menuItemDetail.dispatch({
      type: 'SELECT_OPTION_VALUE',
      optionId: 1,
      optionValueId: 1,
    });

    await flushPromises();
    expect(menuItemDetail.state).toEqual({
      type: 'error',
      productId: 1,
      product: repository.products[0],
      selectedOptionValueIds: [1],
      variant: null,
      amount: 1,
      note: '',
      errorMessage: 'Failed to resolve variant',
    });
  });

  it('transitions to error when the product fails to load', async () => {
    const repository = new MockMenuRepository();
    repository.setShouldFail(true);
    const menuItemDetail = createTester(repository, { productId: 1 });

    await flushPromises();
    expect(menuItemDetail.state).toEqual({
      type: 'error',
      productId: 1,
      product: null,
      selectedOptionValueIds: [],
      variant: null,
      amount: 1,
      note: '',
      errorMessage: 'Failed to fetch product',
    });
  });

  it('updates amount and note while selecting options', async () => {
    const repository = new MockMenuRepository();
    const menuItemDetail = createTester(repository, { productId: 1 });

    await flushPromises();
    menuItemDetail.dispatch({ type: 'CHANGE_AMOUNT', amount: 3 });
    expect(menuItemDetail.state.amount).toBe(3);

    menuItemDetail.dispatch({ type: 'CHANGE_AMOUNT', amount: 0 });
    expect(menuItemDetail.state.amount).toBe(1);

    menuItemDetail.dispatch({ type: 'CHANGE_NOTE', note: 'less sugar' });
    expect(menuItemDetail.state.note).toBe('less sugar');
  });

  it('should show loaded state when initial data is given', () => {
    const repository = new MockMenuRepository();
    const menuItemDetail = createTester(repository, {
      productId: 1,
      product: repository.products[0],
    });

    expect(menuItemDetail.state.type).toBe('selectingOptions');
    expect(menuItemDetail.state.product).toEqual(repository.products[0]);
  });

  // D6 in docs/trd-order-app-composition-and-ssr.md: one instance serves
  // successive selections.
  describe('SELECT_PRODUCT', () => {
    it('fetches the newly selected product from idle', async () => {
      const repository = new MockMenuRepository();
      const menuItemDetail = createTester(repository, { productId: null });

      menuItemDetail.dispatch({ type: 'SELECT_PRODUCT', productId: 2 });
      expect(menuItemDetail.state.type).toBe('loadingProduct');
      expect(menuItemDetail.state.productId).toBe(2);

      await flushPromises();
      await flushPromises();
      expect(menuItemDetail.state.type).toBe('ready');
      expect(menuItemDetail.state.product).toEqual(repository.products[1]);
    });

    it('resets the draft amount, note and options when a different item is selected from ready', async () => {
      const repository = new MockMenuRepository();
      const menuItemDetail = createTester(repository, { productId: 1 });

      await flushPromises();
      menuItemDetail.dispatch({
        type: 'SELECT_OPTION_VALUE',
        optionId: 1,
        optionValueId: 1,
      });
      await flushPromises();
      menuItemDetail.dispatch({ type: 'CHANGE_AMOUNT', amount: 3 });
      menuItemDetail.dispatch({ type: 'CHANGE_NOTE', note: 'less sugar' });
      expect(menuItemDetail.state.type).toBe('ready');

      menuItemDetail.dispatch({ type: 'SELECT_PRODUCT', productId: 2 });

      expect(menuItemDetail.state).toEqual({
        type: 'loadingProduct',
        productId: 2,
        product: null,
        selectedOptionValueIds: [],
        variant: null,
        amount: 1,
        note: '',
        errorMessage: null,
      });

      await flushPromises();
      await flushPromises();
      expect(menuItemDetail.state.type).toBe('ready');
      expect(menuItemDetail.state.product).toEqual(repository.products[1]);
    });
  });
});
