// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  Cart as ApiCart,
  CartItem as ApiCartItem,
  PendingPayment as ApiPendingPayment,
} from '../../../../api-contract/src';
import { Cart, CartItem, PendingPayment } from '../../domain/entities/Cart';
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

export function toPendingPayment(
  pendingPayment: ApiPendingPayment
): PendingPayment {
  return {
    partnerReferenceNo: pendingPayment.partnerReferenceNo,
    method: pendingPayment.method,
    amount: pendingPayment.amount,
    expiredAt: pendingPayment.expiredAt,
    canCancel: pendingPayment.canCancel,
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
    pendingPayment: cart.pendingPayment
      ? toPendingPayment(cart.pendingPayment)
      : null,
  };
}
