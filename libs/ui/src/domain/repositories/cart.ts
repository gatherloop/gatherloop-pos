import { Cart } from '../entities';

// FR-3/FR-7 in docs/prd-table-ordering.md. Every route returns the whole
// cart (server-authoritative per D7), so every method here resolves to a
// full `Cart` — the usecase never reconstructs state from a partial reply.
// The session id itself is never a parameter: it travels as the
// `X-Session-Id` header, attached once by the axios interceptor registered
// in `SessionProvider` (D22), not per-call.
export interface CartRepository {
  fetchCurrentCart: () => Promise<Cart>;

  addItem: (params: {
    variantId: number;
    amount: number;
    note: string;
  }) => Promise<Cart>;

  updateItem: (params: {
    cartItemId: number;
    amount: number;
    note: string;
  }) => Promise<Cart>;

  removeItem: (cartItemId: number) => Promise<Cart>;

  clearCart: () => Promise<Cart>;
}
