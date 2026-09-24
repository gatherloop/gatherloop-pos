// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  Cart as ApiCart,
  PendingPayment as ApiPendingPayment,
} from '../../../../api-contract/src';
import { toCart, toPendingPayment } from './cart.transformer';

const baseApiCart: ApiCart = {
  id: 1,
  sessionId: 'session-1',
  status: 'active',
  items: [],
  itemCount: 0,
  total: 0,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const apiPendingPayment: ApiPendingPayment = {
  partnerReferenceNo: 'ORD1234567890AB',
  method: 'qris',
  amount: 45000,
  expiredAt: '2024-03-20T00:05:00.000Z',
  canCancel: false,
};

describe('toPendingPayment', () => {
  it('maps every field', () => {
    expect(toPendingPayment(apiPendingPayment)).toEqual({
      partnerReferenceNo: 'ORD1234567890AB',
      method: 'qris',
      amount: 45000,
      expiredAt: '2024-03-20T00:05:00.000Z',
      canCancel: false,
    });
  });
});

describe('toCart', () => {
  it('carries the pending payment when the cart is locked', () => {
    const cart = toCart({ ...baseApiCart, pendingPayment: apiPendingPayment });

    expect(cart.pendingPayment).toEqual({
      partnerReferenceNo: 'ORD1234567890AB',
      method: 'qris',
      amount: 45000,
      expiredAt: '2024-03-20T00:05:00.000Z',
      canCancel: false,
    });
  });

  it('is null when the cart carries no pending payment', () => {
    const cart = toCart(baseApiCart);

    expect(cart.pendingPayment).toBeNull();
  });
});
