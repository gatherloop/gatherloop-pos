// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  cartClear,
  cartGetCurrent,
  cartItemCreate,
  cartItemDeleteById,
  cartItemUpdateById,
} from '../../../../api-contract/src';
// Deep import, not the `domain` barrel (D20): that barrel also re-exports
// every POS usecase, which drags unrelated weight into the order bundle.
import { CartRepository } from '../../domain/repositories/cart';
import { toCart } from './cart.transformer';

// FR-3/FR-7 in docs/prd-table-ordering.md. No `QueryClient` here, unlike
// `ApiMenuRepository` — every call is a mutation-shaped round trip (even the
// GET), the whole cart is never reused as cached data, and the state
// machine (D14), not React Query, is what holds cart state. The
// `X-Session-Id` header is attached once, globally, by the interceptor
// `SessionProvider` registers (D22) — this repository never touches the
// session itself.
export class ApiCartRepository implements CartRepository {
  fetchCurrentCart: CartRepository['fetchCurrentCart'] = () => {
    return cartGetCurrent().then(({ data }) => toCart(data));
  };

  addItem: CartRepository['addItem'] = ({ variantId, amount, note }) => {
    return cartItemCreate({ variantId, amount, note }).then(({ data }) =>
      toCart(data)
    );
  };

  updateItem: CartRepository['updateItem'] = ({
    cartItemId,
    amount,
    note,
  }) => {
    return cartItemUpdateById(cartItemId, { amount, note }).then(
      ({ data }) => toCart(data)
    );
  };

  removeItem: CartRepository['removeItem'] = (cartItemId) => {
    return cartItemDeleteById(cartItemId).then(({ data }) => toCart(data));
  };

  clearCart: CartRepository['clearCart'] = () => {
    return cartClear().then(({ data }) => toCart(data));
  };
}
