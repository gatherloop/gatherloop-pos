import { match, P } from 'ts-pattern';
import { Cart, CartItem } from '../entities';
import { CartRepository } from '../repositories';
import { Usecase } from './IUsecase';

// FR-7/D14 in docs/prd-table-ordering.md. One machine owns the whole cart —
// fetch and every mutation — because the floating bar, the cart screen and
// add-to-cart (phase 8's CTA) all read the same cart. `pendingMutation`
// carries whatever `onStateChange` needs to replay the in-flight call; it
// isn't part of the PRD's illustrative sketch, but a reducer that only sees
// `state` (never the triggering action) has nowhere else to keep it.
type PendingMutation =
  | { kind: 'add'; variantId: number; amount: number; note: string }
  | { kind: 'update'; cartItemId: number; amount: number; note: string }
  | { kind: 'remove'; cartItemId: number }
  | { kind: 'clear' };

type Context = {
  cart: Cart | null;
  previousCart: Cart | null;
  pendingMutation: PendingMutation | null;
  errorMessage: string | null;
};

export type CartState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'adding' }
  | { type: 'updating' }
  | { type: 'removing' }
  | { type: 'clearing' }
) &
  Context;

export type CartAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; cart: Cart }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'ADD_ITEM'; variantId: number; amount: number; note: string }
  | { type: 'UPDATE_ITEM'; cartItemId: number; amount: number; note: string }
  | { type: 'REMOVE_ITEM'; cartItemId: number }
  | { type: 'CLEAR' }
  | { type: 'MUTATE_SUCCESS'; cart: Cart }
  | { type: 'MUTATE_ERROR'; message: string };

export type CartParams = {
  cart?: Cart | null;
};

// Recomputes the lines a mutating action touches optimistically (D9's merge
// rule is server-side; here it's just quantity/removal). `price` on an
// existing line is already server-resolved, so this stays a client-side
// arithmetic mirror of D7, not a new price source. `ADD_ITEM` is the one
// mutation with no optimistic line — the added line's price and resolved
// variant only exist once the server responds, so `adding` leaves `cart`
// untouched until `MUTATE_SUCCESS`.
function recomputeCart(cart: Cart, items: CartItem[]): Cart {
  return {
    ...cart,
    items,
    itemCount: items.reduce((sum, item) => sum + item.amount, 0),
    total: items.reduce((sum, item) => sum + item.subtotal, 0),
  };
}

function withUpdatedItem(
  cart: Cart,
  cartItemId: number,
  amount: number,
  note: string
): Cart {
  return recomputeCart(
    cart,
    cart.items.map((item) =>
      item.id === cartItemId
        ? { ...item, amount, note, subtotal: item.price * amount }
        : item
    )
  );
}

function withRemovedItem(cart: Cart, cartItemId: number): Cart {
  return recomputeCart(
    cart,
    cart.items.filter((item) => item.id !== cartItemId)
  );
}

export class CartUsecase extends Usecase<CartState, CartAction, CartParams> {
  cartRepository: CartRepository;
  params: CartParams;

  constructor(cartRepository: CartRepository, params: CartParams = {}) {
    super();
    this.cartRepository = cartRepository;
    this.params = params;
  }

  getInitialState(): CartState {
    const context: Context = {
      cart: this.params.cart ?? null,
      previousCart: null,
      pendingMutation: null,
      errorMessage: null,
    };

    return { ...context, type: context.cart ? 'loaded' : 'idle' };
  }

  getNextState(state: CartState, action: CartAction): CartState {
    return match([state, action])
      .returnType<CartState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading', errorMessage: null })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { cart }]) => ({
          ...state,
          type: 'loaded',
          cart,
          previousCart: null,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          errorMessage: message,
        })
      )
      .with(
        [{ type: 'loaded' }, { type: 'ADD_ITEM' }],
        ([state, { variantId, amount, note }]) => ({
          ...state,
          type: 'adding',
          previousCart: state.cart,
          pendingMutation: { kind: 'add', variantId, amount, note },
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'loaded' }, { type: 'UPDATE_ITEM' }],
        ([state, { cartItemId, amount, note }]) => ({
          ...state,
          type: 'updating',
          previousCart: state.cart,
          cart: state.cart
            ? withUpdatedItem(state.cart, cartItemId, amount, note)
            : state.cart,
          pendingMutation: { kind: 'update', cartItemId, amount, note },
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'loaded' }, { type: 'REMOVE_ITEM' }],
        ([state, { cartItemId }]) => ({
          ...state,
          type: 'removing',
          previousCart: state.cart,
          cart: state.cart ? withRemovedItem(state.cart, cartItemId) : state.cart,
          pendingMutation: { kind: 'remove', cartItemId },
          errorMessage: null,
        })
      )
      .with([{ type: 'loaded' }, { type: 'CLEAR' }], ([state]) => ({
        ...state,
        type: 'clearing',
        previousCart: state.cart,
        cart: state.cart ? recomputeCart(state.cart, []) : state.cart,
        pendingMutation: { kind: 'clear' },
        errorMessage: null,
      }))
      .with(
        [
          { type: P.union('adding', 'updating', 'removing', 'clearing') },
          { type: 'MUTATE_SUCCESS' },
        ],
        ([state, { cart }]) => ({
          ...state,
          type: 'loaded',
          cart,
          previousCart: null,
          pendingMutation: null,
        })
      )
      .with(
        [
          { type: P.union('adding', 'updating', 'removing', 'clearing') },
          { type: 'MUTATE_ERROR' },
        ],
        ([state, { message }]) => ({
          ...state,
          type: 'loaded',
          cart: state.previousCart,
          previousCart: null,
          pendingMutation: null,
          errorMessage: message,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(state: CartState, dispatch: (action: CartAction) => void): void {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, () =>
        this.cartRepository
          .fetchCurrentCart()
          .then((cart) => dispatch({ type: 'FETCH_SUCCESS', cart }))
          .catch(() =>
            dispatch({ type: 'FETCH_ERROR', message: 'Failed to fetch cart' })
          )
      )
      .with(
        { type: P.union('adding', 'updating', 'removing', 'clearing') },
        ({ pendingMutation }) => {
          if (!pendingMutation) return;

          match(pendingMutation)
            .with({ kind: 'add' }, ({ variantId, amount, note }) =>
              this.cartRepository.addItem({ variantId, amount, note })
            )
            .with({ kind: 'update' }, ({ cartItemId, amount, note }) =>
              this.cartRepository.updateItem({ cartItemId, amount, note })
            )
            .with({ kind: 'remove' }, ({ cartItemId }) =>
              this.cartRepository.removeItem(cartItemId)
            )
            .with({ kind: 'clear' }, () => this.cartRepository.clearCart())
            .exhaustive()
            .then((cart) => dispatch({ type: 'MUTATE_SUCCESS', cart }))
            .catch(() =>
              dispatch({
                type: 'MUTATE_ERROR',
                message: 'Failed to update cart',
              })
            );
        }
      )
      .otherwise(() => {
        // No side effects for other states
      });
  }
}
