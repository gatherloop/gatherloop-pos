// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  cartClear,
  cartGetCurrent,
  cartItemCreate,
  cartItemDeleteById,
  cartItemUpdateById,
  cartUpdateTable,
} from '../../../../api-contract/src';
import { RequestConfig } from '@kubb/swagger-client/client';
import { CartRepository } from '../../domain/repositories/cart';
import { SessionRepository } from '../../domain/repositories/session';
import { toCart } from './cart.transformer';

export class ApiCartRepository implements CartRepository {
  constructor(private readonly sessionRepository: SessionRepository) {}

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

  updateTable: CartRepository['updateTable'] = (tableCode, options) => {
    return cartUpdateTable(
      { tableCode },
      this.withSessionOptions(options)
    ).then(({ data }) => toCart(data));
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
