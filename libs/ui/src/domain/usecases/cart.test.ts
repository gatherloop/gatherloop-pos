import { CartUsecase, CartAction, CartState, CartParams } from './cart';
import { MockCartQueryRepository, MockCartRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';
import { Cart } from '../entities';

const createTester = (
  repository: MockCartRepository,
  params: CartParams = {},
  queryRepository: MockCartQueryRepository = new MockCartQueryRepository()
) =>
  new UsecaseTester<CartUsecase, CartState, CartAction, CartParams>(
    new CartUsecase(repository, queryRepository, params)
  );

describe('CartUsecase', () => {
  describe('fetch flow', () => {
    it('should transition idle → loading → loaded', async () => {
      const repository = new MockCartRepository();
      const cart = createTester(repository);

      expect(cart.state.type).toBe('loading');

      await flushPromises();
      expect(cart.state.type).toBe('loaded');
      expect(cart.state.cart).toEqual(repository.cart);
    });

    it('should transition loading → error → loading → loaded on retry', async () => {
      const repository = new MockCartRepository();
      repository.setShouldFail(true);
      const cart = createTester(repository);

      await flushPromises();
      expect(cart.state.type).toBe('error');
      expect(cart.state.errorMessage).toBe('Failed to fetch cart');

      repository.setShouldFail(false);
      cart.dispatch({ type: 'FETCH' });
      expect(cart.state.type).toBe('loading');
      expect(cart.state.errorMessage).toBeNull();

      await flushPromises();
      expect(cart.state.type).toBe('loaded');
    });

    it('should start loaded when a cart is seeded through params', () => {
      const repository = new MockCartRepository();
      const seeded: Cart = { ...repository.cart };
      const cart = createTester(repository, { cart: seeded });

      expect(cart.state.type).toBe('loaded');
      expect(cart.state.cart).toEqual(seeded);
    });
  });

  describe('ADD_ITEM', () => {
    it('should transition loaded → adding → loaded with the server cart, leaving `cart` untouched while in flight', async () => {
      const repository = new MockCartRepository();
      const cart = createTester(repository, { cart: { ...repository.cart } });
      const initialCart = cart.state.cart;

      cart.dispatch({ type: 'ADD_ITEM', variantId: 1, amount: 2, note: '' });
      expect(cart.state.type).toBe('adding');
      expect(cart.state.cart).toEqual(initialCart);
      expect(cart.state.previousCart).toEqual(initialCart);

      await flushPromises();
      expect(cart.state.type).toBe('loaded');
      expect(cart.state.previousCart).toBeNull();
      expect(cart.state.cart?.items).toHaveLength(1);
      expect(cart.state.cart?.items[0]).toMatchObject({
        variantId: 1,
        amount: 2,
        price: 18000,
        subtotal: 36000,
      });
      expect(cart.state.cart?.itemCount).toBe(2);
      expect(cart.state.cart?.total).toBe(36000);
    });

    it('should restore the previous cart on MUTATE_ERROR', async () => {
      const repository = new MockCartRepository();
      const cart = createTester(repository, { cart: { ...repository.cart } });
      const initialCart = cart.state.cart;

      repository.setShouldFail(true);
      cart.dispatch({ type: 'ADD_ITEM', variantId: 1, amount: 1, note: '' });
      expect(cart.state.type).toBe('adding');

      await flushPromises();
      expect(cart.state.type).toBe('loaded');
      expect(cart.state.cart).toEqual(initialCart);
      expect(cart.state.previousCart).toBeNull();
      expect(cart.state.errorMessage).toBe('Failed to update cart');
    });
  });

  describe('UPDATE_ITEM', () => {
    async function seedTesterWithOneItem() {
      const repository = new MockCartRepository();
      await repository.addItem({ variantId: 1, amount: 1, note: '' });
      const cart = createTester(repository, { cart: { ...repository.cart } });
      return { repository, cart };
    }

    it('should optimistically update the line, then reconcile with the server on MUTATE_SUCCESS', async () => {
      const { repository, cart } = await seedTesterWithOneItem();
      const [seededItem] = repository.cart.items;

      cart.dispatch({
        type: 'UPDATE_ITEM',
        cartItemId: seededItem.id,
        amount: 3,
        note: 'less sugar',
      });
      expect(cart.state.type).toBe('updating');
      expect(cart.state.cart?.items[0]).toMatchObject({
        amount: 3,
        note: 'less sugar',
        subtotal: 54000,
      });
      expect(cart.state.cart?.itemCount).toBe(3);
      expect(cart.state.cart?.total).toBe(54000);

      await flushPromises();
      expect(cart.state.type).toBe('loaded');
      expect(cart.state.previousCart).toBeNull();
      expect(cart.state.cart).toEqual(repository.cart);
    });

    it('should restore the previous cart on MUTATE_ERROR', async () => {
      const { repository, cart } = await seedTesterWithOneItem();
      const [seededItem] = repository.cart.items;
      const cartBeforeUpdate = cart.state.cart;

      repository.setShouldFail(true);
      cart.dispatch({
        type: 'UPDATE_ITEM',
        cartItemId: seededItem.id,
        amount: 5,
        note: '',
      });
      expect(cart.state.cart?.items[0].amount).toBe(5);

      await flushPromises();
      expect(cart.state.type).toBe('loaded');
      expect(cart.state.cart).toEqual(cartBeforeUpdate);
      expect(cart.state.previousCart).toBeNull();
      expect(cart.state.errorMessage).toBe('Failed to update cart');
    });
  });

  describe('REMOVE_ITEM', () => {
    it('should optimistically remove the line, then reconcile on MUTATE_SUCCESS', async () => {
      const repository = new MockCartRepository();
      await repository.addItem({ variantId: 1, amount: 1, note: '' });
      const cart = createTester(repository, { cart: { ...repository.cart } });
      const [seededItem] = repository.cart.items;

      cart.dispatch({ type: 'REMOVE_ITEM', cartItemId: seededItem.id });
      expect(cart.state.type).toBe('removing');
      expect(cart.state.cart?.items).toHaveLength(0);
      expect(cart.state.cart?.total).toBe(0);

      await flushPromises();
      expect(cart.state.type).toBe('loaded');
      expect(cart.state.cart?.items).toHaveLength(0);
      expect(cart.state.previousCart).toBeNull();
    });

    it('should restore the previous cart on MUTATE_ERROR', async () => {
      const repository = new MockCartRepository();
      await repository.addItem({ variantId: 1, amount: 1, note: '' });
      const cart = createTester(repository, { cart: { ...repository.cart } });
      const [seededItem] = repository.cart.items;
      const cartBeforeRemove = cart.state.cart;

      repository.setShouldFail(true);
      cart.dispatch({ type: 'REMOVE_ITEM', cartItemId: seededItem.id });
      expect(cart.state.cart?.items).toHaveLength(0);

      await flushPromises();
      expect(cart.state.type).toBe('loaded');
      expect(cart.state.cart).toEqual(cartBeforeRemove);
      expect(cart.state.cart?.items).toHaveLength(1);
      expect(cart.state.errorMessage).toBe('Failed to update cart');
    });
  });

  describe('CLEAR', () => {
    it('should optimistically empty the cart, then reconcile on MUTATE_SUCCESS', async () => {
      const repository = new MockCartRepository();
      await repository.addItem({ variantId: 1, amount: 1, note: '' });
      await repository.addItem({ variantId: 2, amount: 1, note: '' });
      const cart = createTester(repository, { cart: { ...repository.cart } });

      cart.dispatch({ type: 'CLEAR' });
      expect(cart.state.type).toBe('clearing');
      expect(cart.state.cart?.items).toHaveLength(0);
      expect(cart.state.cart?.total).toBe(0);

      await flushPromises();
      expect(cart.state.type).toBe('loaded');
      expect(cart.state.cart?.items).toHaveLength(0);
    });
  });

  describe('item selection', () => {
    it('holds the selected item id, from any fetch/mutation state, without changing it', async () => {
      const repository = new MockCartRepository();
      const cart = createTester(repository);
      await flushPromises();

      cart.dispatch({ type: 'SELECT_ITEM', itemId: 1 });

      expect(cart.state.type).toBe('loaded');
      expect(cart.state.selectedItemId).toBe(1);
    });

    it('clears the selected item id', async () => {
      const repository = new MockCartRepository();
      const cart = createTester(repository);
      await flushPromises();

      cart.dispatch({ type: 'SELECT_ITEM', itemId: 1 });
      cart.dispatch({ type: 'CLEAR_ITEM' });

      expect(cart.state.selectedItemId).toBeNull();
    });

    it('reads the initial selection from the query repository', () => {
      const repository = new MockCartRepository();
      const queryRepository = new MockCartQueryRepository();
      jest.spyOn(queryRepository, 'getSelectedItemId').mockReturnValue(5);

      const cart = createTester(repository, {}, queryRepository);

      expect(cart.state.selectedItemId).toBe(5);
    });

    it('mirrors a selection into the query repository', async () => {
      const repository = new MockCartRepository();
      const queryRepository = new MockCartQueryRepository();
      const setSpy = jest.spyOn(queryRepository, 'setSelectedItemId');
      const cart = createTester(repository, undefined, queryRepository);
      await flushPromises();
      setSpy.mockClear();

      cart.dispatch({ type: 'SELECT_ITEM', itemId: 3 });

      expect(setSpy).toHaveBeenCalledWith(3);
    });

    it('does not re-write the query repository on unrelated state changes', async () => {
      const repository = new MockCartRepository();
      const queryRepository = new MockCartQueryRepository();
      jest.spyOn(queryRepository, 'getSelectedItemId').mockReturnValue(3);
      const setSpy = jest.spyOn(queryRepository, 'setSelectedItemId');
      const cart = createTester(
        repository,
        { cart: { ...repository.cart } },
        queryRepository
      );
      await flushPromises();
      setSpy.mockClear();

      cart.dispatch({ type: 'ADD_ITEM', variantId: 1, amount: 1, note: '' });
      await flushPromises();

      expect(setSpy).not.toHaveBeenCalled();
    });
  });
});
