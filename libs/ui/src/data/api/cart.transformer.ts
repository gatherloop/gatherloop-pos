// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  Cart as ApiCart,
  CartItem as ApiCartItem,
} from '../../../../api-contract/src';
import { Cart, CartItem } from '../../domain/entities/Cart';
import { toVariant } from './variant.transformer';

export function toCartItem(item: ApiCartItem): CartItem {
  return {
    id: item.id,
    cartId: item.cartId,
    variantId: item.variantId,
    variant: toVariant(item.variant),
    amount: item.amount,
    note: item.note,
    price: item.price,
    subtotal: item.subtotal,
    createdAt: item.createdAt,
  };
}

export function toCart(cart: ApiCart): Cart {
  return {
    id: cart.id,
    sessionId: cart.sessionId,
    tableId: cart.tableId ?? null,
    table: cart.table ?? null,
    status: cart.status,
    items: cart.items.map(toCartItem),
    itemCount: cart.itemCount,
    total: cart.total,
    createdAt: cart.createdAt,
  };
}
