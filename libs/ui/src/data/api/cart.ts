// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  cartClear,
  cartGetCurrent,
  cartItemCreate,
  cartItemDeleteById,
  cartItemUpdateById,
} from '../../../../api-contract/src';
import { RequestConfig } from '@kubb/swagger-client/client';
// Deep import, not the `domain` barrel (D20): that barrel also re-exports
// every POS usecase, which drags unrelated weight into the order bundle.
import { CartRepository } from '../../domain/repositories/cart';
import { SessionRepository } from '../../domain/repositories/session';
import { toCart } from './cart.transformer';

// FR-3/FR-7 in docs/prd-table-ordering.md. No `QueryClient` here, unlike
// `ApiMenuRepository` — every call is a mutation-shaped round trip (even the
// GET), the whole cart is never reused as cached data, and the state
// machine (D14), not React Query, is what holds cart state. D3 in
// docs/trd-order-app-composition-and-ssr.md: the session repository is a
// constructor dependency, and `X-Session-Id` travels with the call that
// needs it — there is no global interceptor to register before the first
// request.
export class ApiCartRepository implements CartRepository {
  constructor(private readonly sessionRepository: SessionRepository) {}

  // `withCredentials: false` (D22 in docs/prd-table-ordering.md: the order
  // app sends no auth cookie) moves here too, per request, instead of the
  // global axios default it used to be.
  private withSessionOptions(options?: Partial<RequestConfig>) {
    return {
      ...options,
      withCredentials: false,
      headers: {
        ...options?.headers,
        'X-Session-Id': this.sessionRepository.getSessionId(),
      },
    };
  }

  fetchCurrentCart: CartRepository['fetchCurrentCart'] = (options) => {
    return cartGetCurrent(this.withSessionOptions(options)).then(
      ({ data }) => toCart(data)
    );
  };

  addItem: CartRepository['addItem'] = (
    { variantId, amount, note },
    options
  ) => {
    return cartItemCreate(
      { variantId, amount, note },
      this.withSessionOptions(options)
    ).then(({ data }) => toCart(data));
  };

  updateItem: CartRepository['updateItem'] = (
    { cartItemId, amount, note },
    options
  ) => {
    return cartItemUpdateById(
      cartItemId,
      { amount, note },
      this.withSessionOptions(options)
    ).then(({ data }) => toCart(data));
  };

  removeItem: CartRepository['removeItem'] = (cartItemId, options) => {
    return cartItemDeleteById(
      cartItemId,
      this.withSessionOptions(options)
    ).then(({ data }) => toCart(data));
  };

  clearCart: CartRepository['clearCart'] = (options) => {
    return cartClear(this.withSessionOptions(options)).then(({ data }) =>
      toCart(data)
    );
  };
}
